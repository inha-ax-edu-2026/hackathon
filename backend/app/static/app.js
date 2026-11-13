'use strict';
const $ = id => document.getElementById(id);
const variants = ['quality', 'economy'];
const names = {quality: '고품질형', economy: '가성비형'};
const referrals = {none: '현재 연결 권고 없음 · 안전 보증 아님', check: '추가 확인 필요', recommended: '교사 연결 권고', urgent: '지금 사람의 도움 필요'};
const state = {session: null, ended: false, busy: false, starting: false, recording: false, transcribing: false, turns: [], summary: null, safety: null, safetyTimer: null, safetyPolling: false, generation: 0, controllers: new Set(), audioURLs: new Map(), wav: null, wavURL: null, recorder: null, stream: null, audioContext: null, animation: null, interval: null, waitTimer: null};
let settings = null;
let toastTimer;

function node(tag, className, text) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text !== undefined) result.textContent = text;
  return result;
}
function toast(message, error = false) {
  clearTimeout(toastTimer); $('toast').textContent = message; $('toast').className = error ? 'error' : ''; $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, error ? 10000 : 5000);
}
async function api(path, options = {}) {
  const controller = new AbortController();
  state.controllers.add(controller);
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const headers = {...options.headers};
    if (state.session && path.includes('/sessions/')) headers['X-Session-Token'] = state.session.session_token;
    if (options.json !== undefined) { headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(options.json); }
    const response = await fetch(path, {...options, headers, signal: controller.signal});
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const error = new Error(typeof body.detail === 'string' ? body.detail : `요청에 실패했습니다 (HTTP ${response.status}).`);
      error.status = response.status; throw error;
    }
    return options.binary ? response : await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('요청이 취소되었거나 대기 시간을 초과했습니다. 처리 중이던 API 비용은 발생할 수 있습니다.');
    if (error instanceof TypeError) throw new Error('로컬 서버에 연결하지 못했습니다. 서버 실행 상태를 확인하세요.');
    throw error;
  } finally { clearTimeout(timeout); state.controllers.delete(controller); }
}
const endpoint = suffix => `/api/counsel/sessions/${state.session.session_id}/${suffix}`;
function flow(step) { document.querySelectorAll('[data-step]').forEach(item => item.classList.toggle('current', Number(item.dataset.step) === step)); }
function controls() {
  const active = Boolean(state.session && !state.ended);
  const blocked = state.busy || state.transcribing || state.starting;
  $('startSession').disabled = !$('consentCheck').checked || state.starting;
  $('modeSelect').disabled = Boolean(state.session) || state.starting;
  $('sendButton').disabled = !active || blocked || state.recording || !$('transcript').value.trim();
  $('sendButton').textContent = state.busy ? '두 모델의 답변을 기다리는 중…' : '두 모델에 보내기 ↗';
  $('finishSession').disabled = !active || blocked || state.recording || !state.turns.length;
  $('recordButton').disabled = !active || blocked;
  $('audioFile').disabled = !active || blocked || state.recording;
  $('transcribeButton').disabled = !active || blocked || state.recording || !state.wav;
  $('transcript').disabled = !active || blocked || state.recording;
  $('newSession').disabled = state.starting;
  $('previewHandoff').disabled = !state.summary || !state.session || state.busy;
  document.querySelectorAll('[data-sample]').forEach(button => { button.disabled = !active || blocked || state.recording; });
  $('sessionStatus').textContent = state.ended ? '상담 마무리됨' : state.session ? `${state.session.mode === 'mock' ? '데모' : 'BAZE'} 상담 진행 중` : '상담 시작 전';
  $('charCount').textContent = `${$('transcript').value.length.toLocaleString()} / 4,000`;
}
function modeBanner() {
  const real = $('modeSelect').value === 'baze';
  $('modeBanner').classList.toggle('real', real);
  $('modeBanner').textContent = real ? 'BAZE 실제 모드 · 확인한 이야기로 두 모델을 호출하고 상담 기록을 보관합니다. 위험 기준을 충족하면 교사 보고함에 등록합니다.' : '데모 모드 · 예시 답변을 표시하며 위험 탐지·교사 보고 규칙을 가상 사례로 시연합니다. 데모 보고는 교사 화면에도 데모로 표시됩니다.';
}
async function loadSettings() {
  settings = await api('/api/local/settings');
  $('qualityModel').textContent = state.session?.models.quality || settings.quality_model;
  $('economyModel').textContent = state.session?.models.economy || settings.economy_model;
  $('sttModel').textContent = `Soniox · ${state.session?.stt_model || settings.stt_model}`;
  $('baseURLInput').value = settings.base_url;
  $('keyDot').classList.toggle('green', settings.api_key_present);
  $('keyStatus').textContent = settings.catalog_check ? '키·모델 목록 조회 성공 · 실제 생성은 별도 확인' : settings.api_key_present ? '저장된 키 있음 · 연결은 미검증' : '키 입력 필요';
  for (const [id, key] of [['qualityInput', 'quality_model'], ['economyInput', 'economy_model'], ['sttInput', 'stt_model'], ['ttsInput', 'tts_model']]) {
    if ($(id).tagName === 'SELECT' && !Array.from($(id).options).some(o => o.value === settings[key])) $(id).add(new Option(settings[key], settings[key]));
    $(id).value = settings[key];
  }
  $('gatewayAddress').textContent = `학교 게이트웨이: ${settings.base_url}`;
}
function riskBox(assessment, demo) {
  const box = node('div', `risk ${assessment.referral}`);
  box.append(node('strong', '', demo ? '데모 · 실제 위험도 판단 없음' : referrals[assessment.referral]));
  box.append(node('span', '', assessment.reason));
  const detail = node('details'); detail.append(node('summary', '', '판단 근거 · 확인 질문'));
  assessment.evidence.forEach(text => detail.append(node('blockquote', '', `“${text}”`)));
  if (!assessment.evidence.length) detail.append(node('p', '', '인용 근거 없음'));
  if (assessment.question) detail.append(node('p', '', `확인 질문: ${assessment.question}`));
  box.append(detail); return box;
}
function showUrgent() {
  $('urgent').hidden = !(state.safety?.immediate || state.turns.some(turn => Object.values(turn.results || {}).some(r => r.status === 'ok' && r.mode !== 'mock' && r.assessment.urgency === 'immediate')));
}
function applySafety(next) {
  if (!next) return;
  const previous = state.safety;
  state.safety = {...next, risk_count: Math.max(next.risk_count, previous?.risk_count || 0),
    immediate: Boolean(next.immediate || previous?.immediate), reported: Boolean(next.reported || previous?.reported),
    report: next.report || previous?.report || null};
  const safety = state.safety;
  $('safetyPanel').hidden = false;
  $('riskCounter').textContent = `위험 표현 ${safety.risk_count} / ${safety.threshold}회`;
  $('safetyPanel').classList.toggle('urgent-state', safety.immediate);
  $('safetyPanel').classList.toggle('reported-state', safety.reported);
  $('reportState').textContent = safety.reported
    ? `${state.session?.mode === 'mock' ? '[데모] ' : ''}${safety.immediate ? '즉시 위험 신호로 ' : '위험 표현 누적으로 '}교사 확인함에 보고를 등록했습니다. ${safety.report?.status === 'acknowledged' ? '교사가 보고 내용을 확인했습니다.' : '아직 교사의 확인을 기다리고 있습니다.'}`
    : '서로 다른 위험 발언이 3회 감지되면 보고합니다. 즉시 위험 표현은 첫 발언부터 바로 보고합니다.';
  showUrgent();
}
function startSafetyPolling(generation) {
  clearInterval(state.safetyTimer);
  state.safetyTimer = setInterval(async () => {
    if (generation !== state.generation || !state.session || !state.busy || state.safetyPolling) return;
    state.safetyPolling = true;
    try { const result = await api(endpoint('safety')); if (generation === state.generation) applySafety(result); }
    catch { /* 주 요청의 결과·오류를 유지하고 다음 조회에서 재확인한다. */ }
    finally { if (generation === state.generation) state.safetyPolling = false; }
  }, 1500);
}
function renderChats(pending = []) {
  for (const variant of variants) {
    const chat = $(`${variant}Chat`); chat.replaceChildren();
    if (!state.turns.length && !pending.length) {
      const empty = node('div', 'empty-state'); empty.append(node('span', '', variant === 'quality' ? '✧' : '◌'), node('h3', '', '이야기를 기다리고 있어요'), node('p', '', '녹음하거나 가상 사례를 선택한 뒤 두 모델에 보내 주세요.')); chat.append(empty);
    }
    state.turns.forEach((turn, index) => {
      chat.append(node('div', 'user-message', turn.text));
      const result = turn.results[variant];
      if (!result) { chat.append(node('div', 'loading', '이야기를 살펴보고 있어요…')); return; }
      if (result.status === 'error') {
        chat.append(node('div', 'error-message', result.error));
        if (index === state.turns.length - 1 && !state.ended) {
          const retry = node('button', 'button retry-row', '실패한 모델만 다시 요청'); retry.disabled = state.busy;
          retry.addEventListener('click', () => send(turn)); chat.append(retry);
        }
        return;
      }
      const message = node('div', 'assistant-message'); message.append(node('div', 'reply', result.reply));
      const meta = node('div', 'message-meta');
      meta.append(node('span', '', `${result.mode === 'mock' ? '데모 · ' : ''}${(result.elapsed_ms / 1000).toFixed(2)}초`));
      if (result.usage.total_tokens !== undefined) meta.append(node('span', '', `${result.usage.total_tokens.toLocaleString()} tokens`));
      meta.append(node('span', '', result.usage.credits_charged !== undefined ? `${result.usage.credits_charged} credits` : '차감 크레딧 미제공'));
      const listen = node('button', 'button ghost', result.mode === 'mock' ? '▷ 브라우저 읽기 (데모)' : '▷ 답변 듣기');
      listen.disabled = state.ended; listen.addEventListener('click', () => listenReply(variant, turn, result, listen, message)); meta.append(listen);
      message.append(meta, riskBox(result.assessment, result.mode === 'mock')); chat.append(message);
    });
    if (pending.includes(variant)) chat.append(node('div', 'loading', '모델에 다시 요청하고 있어요…'));
    chat.scrollTop = chat.scrollHeight;
  }
  $('turnCount').textContent = `${state.turns.length}회 이야기 · 각자의 대화 이력`;
  showUrgent();
}
async function start() {
  if (!$('consentCheck').checked || state.starting) return;
  state.starting = true; controls();
  try {
    state.session = await api('/api/counsel/sessions', {method: 'POST', json: {mode: $('modeSelect').value, consent: true, notice_version: 'archive-report-v1'}});
    applySafety(state.session.safety);
    state.ended = false; $('consentBox').hidden = true; $('composer').hidden = false;
    $('qualityModel').textContent = state.session.models.quality; $('economyModel').textContent = state.session.models.economy;
    flow(1); $('transcript').focus(); toast('상담을 시작했습니다. 같은 이야기로 두 모델을 비교해 보세요.');
  } catch (error) { toast(error.message, true); if (error.status === 503) $('settingsDialog').showModal(); }
  finally { state.starting = false; controls(); }
}
async function send(retryTurn = null) {
  if (!state.session || state.ended || state.busy || state.recording || state.transcribing) return;
  const text = retryTurn ? retryTurn.text : $('transcript').value.trim(); if (!text) return;
  const generation = state.generation;
  const requestID = retryTurn ? retryTurn.request_id : crypto.randomUUID();
  const turn = retryTurn || {request_id: requestID, text, results: {}};
  if (!retryTurn) state.turns.push(turn);
  state.busy = true; controls(); renderChats(retryTurn ? variants.filter(v => turn.results[v].status === 'error') : []); flow(2);
  try {
    const safety = await api(endpoint('safety'), {method: 'POST', json: {text, request_id: requestID}});
    if (generation !== state.generation) return;
    applySafety(safety);
    startSafetyPolling(generation);
    const result = await api(endpoint('messages'), {method: 'POST', json: {text, request_id: requestID, retry_failed: Boolean(retryTurn)}});
    if (generation !== state.generation) return;
    turn.results = result.results;
    applySafety(result.safety);
    if (!retryTurn) { $('transcript').value = ''; clearRecording(); }
  } catch (error) {
    if (generation !== state.generation) return;
    for (const variant of variants) if (!turn.results[variant] || turn.results[variant].status === 'error') turn.results[variant] = {status: 'error', error: error.message};
    toast(error.message, true);
  } finally { if (generation === state.generation) { clearInterval(state.safetyTimer); state.safetyPolling = false; state.busy = false; renderChats(); controls(); } }
}
async function listenReply(variant, turn, result, button, parent) {
  if (state.ended) return;
  if (state.session.mode === 'mock') {
    if (!('speechSynthesis' in window)) return toast('이 브라우저는 읽어주기를 지원하지 않습니다.', true);
    speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(result.reply); utterance.lang = 'ko-KR'; utterance.rate = 0.95;
    const koreanVoice = speechSynthesis.getVoices().find(v => v.lang.startsWith('ko')); if (koreanVoice) utterance.voice = koreanVoice;
    speechSynthesis.speak(utterance); return;
  }
  const generation = state.generation;
  const key = `${turn.request_id}:${variant}`; button.disabled = true; button.textContent = '음성 준비 중…';
  try {
    let url = state.audioURLs.get(key);
    if (!url) {
      const response = await api(endpoint('speech'), {method: 'POST', json: {variant, request_id: turn.request_id}, binary: true});
      const blob = await response.blob(); if (generation !== state.generation || state.ended) return;
      url = URL.createObjectURL(blob); state.audioURLs.set(key, url);
      const credit = response.headers.get('X-Credits-Charged');
      toast(credit === null ? '음성 합성 완료 · 차감 크레딧 미제공' : `음성 합성 완료 · ${credit} credits`);
    }
    document.querySelectorAll('.chat audio').forEach(audio => audio.pause());
    let audio = parent.querySelector('audio');
    if (!audio) { audio = node('audio'); audio.controls = true; audio.preload = 'none'; parent.append(audio); }
    audio.src = url;
    await audio.play().catch(() => toast('음성이 준비됐습니다. 재생 버튼을 눌러 주세요.'));
  } catch (error) { if (generation === state.generation) toast(error.message, true); }
  finally { if (generation === state.generation) { button.disabled = state.ended; button.textContent = '▷ 답변 듣기'; } }
}
function clearRecording() {
  $('inputAudio').pause(); $('inputAudio').removeAttribute('src');
  if (state.wavURL) URL.revokeObjectURL(state.wavURL);
  state.wav = state.wavURL = null; $('recordPlayback').hidden = true; $('sttTime').textContent = '';
}
function setRecording(blob) {
  clearRecording(); state.wav = blob; state.wavURL = URL.createObjectURL(blob); $('inputAudio').src = state.wavURL; $('recordPlayback').hidden = false; controls();
}
function stopTracks() {
  if (state.stream) state.stream.getTracks().forEach(track => track.stop());
  state.stream = null; clearInterval(state.interval); cancelAnimationFrame(state.animation);
  if (state.audioContext) state.audioContext.close().catch(() => {});
  state.audioContext = null; state.recording = false; $('recordIcon').classList.remove('recording');
  $('recordButton').textContent = '● 녹음 시작'; $('recordTitle').textContent = '말로 이야기해 보세요';
}
async function asWav(blob) {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    if (!decoded.duration || decoded.duration > 120.1) throw new Error('녹음은 최대 2분까지 사용할 수 있습니다.');
    const resampler = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
    const source = resampler.createBufferSource(); source.buffer = decoded; source.connect(resampler.destination); source.start();
    const rendered = await resampler.startRendering();
    const samples = rendered.getChannelData(0), buffer = new ArrayBuffer(44 + samples.length * 2), view = new DataView(buffer);
    function str(offset, value) { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); }
    str(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); str(36, 'data'); view.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) { const sample = Math.max(-1, Math.min(1, samples[i])); view.setInt16(44 + i * 2, sample < 0 ? sample * 32768 : sample * 32767, true); }
    return new Blob([buffer], {type: 'audio/wav'});
  } finally { await context.close(); }
}
async function record() {
  if (state.recording) { state.recorder.stop(); return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return toast('마이크 녹음이 지원되지 않습니다. localhost의 최신 Chrome·Edge를 사용하세요.', true);
  const generation = state.generation; state.busy = true; controls();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({audio: {channelCount: 1, echoCancellation: true, noiseSuppression: true}});
    if (generation !== state.generation) { stream.getTracks().forEach(t => t.stop()); return; }
    clearRecording(); state.stream = stream;
    const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, mimeType ? {mimeType} : {}); state.recorder = recorder;
    const chunks = []; recorder.addEventListener('dataavailable', event => { if (event.data.size) chunks.push(event.data); });
    recorder.addEventListener('error', () => { if (generation !== state.generation) return; stopTracks(); state.busy = false; controls(); toast('녹음 장치에 오류가 생겼습니다. 다시 시도하거나 텍스트를 입력하세요.', true); });
    recorder.addEventListener('stop', async () => {
      if (generation !== state.generation) { stream.getTracks().forEach(track => track.stop()); return; }
      stopTracks();
      state.busy = true; controls();
      try {
        const wav = await asWav(new Blob(chunks, {type: recorder.mimeType}));
        if (generation !== state.generation) return;
        setRecording(wav); state.busy = false;
        if (state.session.mode === 'baze') await transcribe();
        else toast('녹음 재생을 확인할 수 있습니다. 데모에서는 전사하지 않으므로 가상 사례나 텍스트를 사용하세요.');
      } catch (error) { if (generation === state.generation) toast(error.message || '녹음을 WAV로 변환하지 못했습니다.', true); }
      finally { if (generation === state.generation) { state.busy = false; controls(); } }
    });
    state.audioContext = new AudioContext(); const source = state.audioContext.createMediaStreamSource(stream), analyser = state.audioContext.createAnalyser(); source.connect(analyser); analyser.fftSize = 256;
    const canvas = $('waveform'), ctx = canvas.getContext('2d'), data = new Uint8Array(analyser.frequencyBinCount);
    function draw() {
      analyser.getByteFrequencyData(data); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#8eb6a5';
      for (let i = 0; i < 44; i++) { const h = Math.max(2, data[i * 2] / 7); ctx.fillRect(i * 6 + 2, (44 - h) / 2, 2.5, h); }
      state.animation = requestAnimationFrame(draw);
    }
    draw(); recorder.start(500); state.recording = true; state.busy = false; $('recordTime').textContent = '00:00';
    $('recordIcon').classList.add('recording'); $('recordButton').textContent = '■ 녹음 종료'; $('recordTitle').textContent = '이야기를 듣고 있어요';
    const started = Date.now(); state.interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - started) / 1000); $('recordTime').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      if (seconds >= 120 && recorder.state === 'recording') recorder.stop();
    }, 250);
    flow(1); controls();
  } catch (error) {
    if (generation === state.generation) { stopTracks(); state.busy = false; controls(); toast(error.name === 'NotAllowedError' ? '마이크 권한을 허용하거나 텍스트로 입력해 주세요.' : '마이크를 열지 못했습니다. 장치 연결과 사용 중인 앱을 확인하세요.', true); }
  }
}
async function transcribe() {
  if (!state.wav || !state.session || state.transcribing) return;
  if (state.session.mode === 'mock') return toast('데모에서는 음성 전사하지 않습니다. 실제 STT는 BAZE 모드에서 사용할 수 있습니다.');
  const generation = state.generation; const started = performance.now();
  state.transcribing = true; $('recordHint').textContent = '음성을 텍스트로 바꾸고 있어요 · 최대 5분'; controls();
  try {
    let job = await api(endpoint('transcriptions'), {method: 'POST', body: state.wav, headers: {'Content-Type': 'audio/wav'}});
    const jobID = job.job_id;
    while (job.status === 'processing') {
      await new Promise(resolve => { state.waitResolve = resolve; state.waitTimer = setTimeout(resolve, 10000); });
      state.waitResolve = null;
      if (generation !== state.generation) return;
      if (performance.now() - started > 310000) throw new Error('전사 대기 시간을 초과했습니다. 텍스트로 입력하세요.');
      job = await api(endpoint(`transcriptions/${jobID}`));
    }
    if (generation !== state.generation) return;
    if (job.status !== 'completed') throw new Error(job.error || '음성 전사에 실패했습니다.');
    if (!job.text) throw new Error('인식된 말이 없습니다. 다시 녹음하거나 텍스트로 입력하세요.');
    $('transcript').value = job.text; $('transcript').focus();
    $('sttTime').textContent = `STT ${((performance.now() - started) / 1000).toFixed(1)}초 · ${job.usage?.credits_charged !== undefined ? `${job.usage.credits_charged} credits` : '차감량 미제공'}`;
    toast('인식한 문장을 확인하고 수정한 뒤 전송해 주세요.');
  } catch (error) { if (generation === state.generation) toast(error.message, true); }
  finally { if (generation === state.generation) { state.transcribing = false; $('recordHint').textContent = '최대 2분 · 전사문을 확인한 뒤 전송합니다'; controls(); } }
}
async function finish() {
  if (!state.session || state.ended || state.busy || state.transcribing || state.recording || !state.turns.length) return;
  state.busy = true; const generation = state.generation; controls();
  try {
    const summary = await api(endpoint('finish'), {method: 'POST'});
    if (generation !== state.generation) return;
    state.summary = summary; state.ended = true;
    applySafety(summary.safety);
    if ('speechSynthesis' in window) speechSynthesis.cancel(); document.querySelectorAll('audio').forEach(audio => audio.pause()); clearRecording();
    state.audioURLs.forEach(url => URL.revokeObjectURL(url)); state.audioURLs.clear();
    $('summaryResults').replaceChildren();
    for (const variant of variants) {
      const result = summary.results[variant], card = node('div', 'summary-item'); card.append(node('h3', '', names[variant]));
      if (result.status === 'ok') {
        card.append(node('p', '', result.assessment.summary), riskBox(result.assessment, summary.mode === 'mock'));
        card.append(node('small', '', `대화 중 가장 높은 연결 신호: ${referrals[result.highest_referral]}`));
        if (result.highest_referral !== result.assessment.referral) card.append(node('p', '', `이전 신호 근거: ${result.highest_reason}`));
      } else card.append(node('p', 'error-message', result.error));
      $('summaryResults').append(card);
    }
    $('summarySection').hidden = false; $('composer').hidden = true; updateHandoff(); flow(3); renderChats();
    $('summarySection').scrollIntoView({behavior: 'smooth', block: 'start'});
  } catch (error) { if (generation === state.generation) toast(error.message, true); }
  finally { if (generation === state.generation) { state.busy = false; controls(); } }
}
function updateHandoff() {
  const result = state.summary?.results[$('handoffVariant').value];
  $('handoffSummary').value = result?.status === 'ok' ? result.assessment.summary : '';
  $('handoffConsent').checked = false; $('handoffResult').hidden = true;
}
async function reset() {
  const previous = state.session;
  state.generation++; state.controllers.forEach(c => c.abort()); state.controllers.clear();
  clearTimeout(state.waitTimer); clearInterval(state.safetyTimer); state.waitResolve?.();
  if (state.recorder && state.recorder.state !== 'inactive') { try { state.recorder.stop(); } catch {} }
  stopTracks(); if ('speechSynthesis' in window) speechSynthesis.cancel();
  document.querySelectorAll('audio').forEach(audio => audio.pause()); clearRecording();
  state.audioURLs.forEach(url => URL.revokeObjectURL(url)); state.audioURLs.clear();
  Object.assign(state, {session: null, ended: false, busy: false, starting: false, transcribing: false, turns: [], summary: null, safety: null, safetyPolling: false});
  $('safetyPanel').hidden = true;
  $('consentBox').hidden = false; $('composer').hidden = true; $('summarySection').hidden = true; $('transcript').value = ''; $('recordTime').textContent = '00:00';
  $('consentCheck').checked = false; $('handoffSummary').value = ''; $('teacher').value = ''; $('handoffResult').textContent = '';
  $('handoffConsent').checked = false; $('summaryResults').replaceChildren(); controls(); renderChats(); flow(0);
  if (previous) {
    try {
      const response = await fetch(`/api/counsel/sessions/${previous.session_id}`, {method: 'DELETE', headers: {'X-Session-Token': previous.session_token}});
      if (!response.ok && response.status !== 404) toast('접속 세션 종료를 확인하지 못했습니다. 저장된 상담 기록과 보고는 유지됩니다.', true);
    } catch { toast('접속 세션 종료 확인에 실패했습니다. 저장된 상담 기록과 보고는 유지됩니다.', true); }
  }
  loadSettings().catch(error => toast(error.message, true));
}

$('settingsOpen').addEventListener('click', async () => { try { await loadSettings(); $('verifyResult').hidden = true; $('settingsDialog').showModal(); } catch (error) { toast(error.message, true); } });
$('settingsClose').addEventListener('click', () => { $('apiKey').value = ''; $('settingsDialog').close(); });
$('settingsDialog').addEventListener('close', () => { $('apiKey').value = ''; });
async function saveConfiguration(verify = false) {
  if (!$('settingsForm').reportValidity()) return;
  $('saveSettings').disabled = $('verifySettings').disabled = true;
  $('verifyResult').hidden = !verify;
  if (verify) $('verifyResult').textContent = '키 인증과 사용 가능한 모델 목록을 확인하고 있어요…';
  try {
    await api('/api/local/settings', {method: 'POST', json: {api_key: $('apiKey').value || null, base_url: $('baseURLInput').value.trim(), quality_model: $('qualityInput').value.trim(), economy_model: $('economyInput').value.trim(), stt_model: $('sttInput').value, tts_model: $('ttsInput').value}});
    $('apiKey').value = '';
    if (verify) {
      const result = await api('/api/local/verify', {method: 'POST'});
      const labels = {quality: '고품질형', economy: '가성비형', stt: 'STT', tts: 'TTS'};
      $('verifyResult').replaceChildren(node('strong', '', '모델 목록 조회 성공'));
      for (const [role, model] of Object.entries(result.models)) $('verifyResult').append(node('div', '', `${labels[role]} · ${model.id}: ${model.listed ? '목록에 있음' : '목록에 없음 · 권한·ID 확인 필요'}`));
      $('verifyResult').append(node('div', '', result.message));
    } else { $('settingsDialog').close(); toast('설정을 저장했습니다. 새 상담부터 적용됩니다.'); }
    await loadSettings();
  } catch (error) { $('apiKey').value = ''; if (verify) { $('verifyResult').hidden = false; $('verifyResult').textContent = error.message; } toast(error.message, true); }
  finally { $('saveSettings').disabled = $('verifySettings').disabled = false; }
}
$('verifyQuality').addEventListener('click', async () => {
  $('verifyQuality').disabled = $('saveSettings').disabled = $('verifySettings').disabled = true;
  $('verifyResult').hidden = false;
  $('verifyResult').textContent = '저장된 고성능 모델 하나로 가상 상담 응답을 확인하고 있습니다…';
  try {
    const result = await api('/api/local/verify-quality', {method:'POST'});
    $('verifyResult').replaceChildren(node('strong', '', `${result.model} · 실제 응답 확인`), node('p', '', result.reply), node('div', '', result.message));
  } catch (error) { $('verifyResult').textContent = error.message; }
  finally { $('verifyQuality').disabled = $('saveSettings').disabled = $('verifySettings').disabled = false; }
});
$('settingsForm').addEventListener('submit', event => { event.preventDefault(); saveConfiguration(); });
$('verifySettings').addEventListener('click', () => saveConfiguration(true));
$('consentCheck').addEventListener('change', controls); $('modeSelect').addEventListener('change', modeBanner);
$('startSession').addEventListener('click', start); $('newSession').addEventListener('click', reset); $('deleteSession').addEventListener('click', reset);
$('sendButton').addEventListener('click', () => send()); $('finishSession').addEventListener('click', finish); $('recordButton').addEventListener('click', record); $('transcribeButton').addEventListener('click', transcribe);
$('transcript').addEventListener('input', controls);
$('audioFile').addEventListener('change', event => {
  const file = event.target.files[0]; if (!file) return;
  if (!file.name.toLowerCase().endsWith('.wav') || file.size > 12 * 1024 * 1024) { event.target.value = ''; return toast('12MB 이하 WAV 파일을 선택하세요.', true); }
  setRecording(file); event.target.value = ''; toast('녹음을 불러왔습니다. 음성 → 텍스트 변환을 눌러 주세요.');
});
const samples = {friends: '요즘 친구들이 쉬는 시간마다 자기들끼리만 놀아서 혼자 있는 시간이 많아요. 먼저 말을 걸면 싫어할까 봐 걱정돼요.', bullying: '같은 반 친구들이 며칠째 단체 채팅방에서 저를 빼고 놀려요. 내일 학교에서 또 마주칠 생각을 하니 무서워요.', negation: '오늘 안전교육에서 위험한 말을 들었는데 제 얘기는 아니에요. 저는 다치고 싶은 마음은 없고 친구와 다툰 일이 속상해서 이야기하고 싶어요.'};
document.querySelectorAll('[data-sample]').forEach(button => button.addEventListener('click', () => { $('transcript').value = samples[button.dataset.sample]; controls(); $('transcript').focus(); }));
$('helpButton').addEventListener('click', () => $('helpDialog').showModal()); $('helpClose').addEventListener('click', () => $('helpDialog').close());
$('helpFinish').addEventListener('click', () => { $('helpDialog').close(); if (!state.turns.length) toast('상담 요약은 답변을 받은 뒤 확인할 수 있습니다. 도움 요청은 직접 담당 선생님에게 연락해 주세요.'); else finish(); });
$('handoffVariant').addEventListener('change', updateHandoff);
for (const id of ['teacher', 'handoffSummary']) $(id).addEventListener('input', () => { $('handoffConsent').checked = false; $('handoffResult').hidden = true; });
$('previewHandoff').addEventListener('click', async () => {
  if (!$('handoffConsent').checked || !$('teacher').value.trim() || !$('handoffSummary').value.trim()) return toast('가상 담당 교사와 전달 내용을 입력하고 확인란을 체크하세요.', true);
  const generation = state.generation;
  try {
    const result = await api(endpoint('handoff-preview'), {method: 'POST', json: {variant: $('handoffVariant').value, teacher: $('teacher').value.trim(), summary: $('handoffSummary').value.trim(), consent: true}});
    if (generation !== state.generation) return;
    $('handoffResult').textContent = `[미리보기 · 발송 안 함]\n담당: ${result.teacher}\n\n${result.summary}\n\n${result.message}`; $('handoffResult').hidden = false;
  } catch (error) { if (generation === state.generation) toast(error.message, true); }
});
window.addEventListener('beforeunload', () => {
  clearInterval(state.safetyTimer);
  stopTracks(); if ('speechSynthesis' in window) speechSynthesis.cancel();
  if (state.session) fetch(endpoint('').replace(/\/$/, ''), {method: 'DELETE', headers: {'X-Session-Token': state.session.session_token}, keepalive: true}).catch(() => {});
});
controls(); modeBanner(); loadSettings().catch(error => toast(error.message, true));
