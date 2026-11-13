'use strict';
const $ = id => document.getElementById(id);
const teacherState = {key: '', generation: 0, timer: null, loading: false, reportID: null};
const labels = {quality: '고품질형', economy: '가성비형'};
const kinds = {suicide: '생명·안전 관련 표현', self_harm: '자해 관련 표현', violence: '위협·폭력', bullying: '괴롭힘·따돌림', abuse: '학대 관련 표현', other: '기타 도움 신호'};
function element(tag, className, text) { const n = document.createElement(tag); if (className) n.className = className; if (text !== undefined) n.textContent = text; return n; }
function date(value) { return value ? new Date(value).toLocaleString('ko-KR') : '진행 중'; }
function status(message, error = false) { $('teacherStatus').textContent = message; $('teacherStatus').classList.toggle('teacher-status-error', error); }
async function api(path, method = 'GET') {
  const response = await fetch('/api/teacher' + path, {method, headers: {'X-Teacher-Key': teacherState.key}});
  if (!response.ok) { const body = await response.json().catch(() => ({})); const error = new Error(typeof body.detail === 'string' ? body.detail : '기록을 불러오지 못했습니다.'); error.status = response.status; throw error; }
  return response.json();
}
function logout() {
  teacherState.generation++; teacherState.key = ''; teacherState.reportID = null; clearInterval(teacherState.timer);
  $('teacherKey').value = ''; $('loginForm').hidden = false; $('dashboard').hidden = true; $('logout').hidden = true; $('refresh').disabled = true;
  $('reportList').replaceChildren(); $('conversationList').replaceChildren(); $('detailBody').replaceChildren(); $('recordDetail').hidden = true;
  document.title = 'SAFE-PATH · 교사 확인함';
}
async function refresh() {
  if (!teacherState.key || teacherState.loading) return;
  const generation = teacherState.generation; teacherState.loading = true; $('refresh').disabled = true;
  try {
    const [reports, conversations] = await Promise.all([api('/reports'), api('/conversations')]);
    if (generation !== teacherState.generation) return;
    $('reportList').replaceChildren(); $('conversationList').replaceChildren();
    const unread = reports.items.filter(r => r.status === 'unread').length;
    const urgent = reports.items.filter(r => r.severity === 'urgent' && r.status === 'unread').length;
    $('unreadCount').textContent = String(unread); $('urgentCount').textContent = String(urgent); $('archiveCount').textContent = String(conversations.items.length);
    document.title = `${unread ? `(${unread}) ` : ''}SAFE-PATH · 교사 확인함`;
    for (const report of reports.items) {
      const row = element('button', 'teacher-row' + (report.severity === 'urgent' ? ' urgent' : ''));
      const top = element('div', 'teacher-row-header'); top.append(element('span', '', report.alias), element('span', 'pill', `${report.mode === 'mock' ? '데모 · ' : ''}${report.severity === 'urgent' ? '즉시 확인 필요' : '누적 신호'} · ${report.status === 'unread' ? '미확인' : '확인함'}`));
      row.append(top, element('p', '', report.reason), element('small', '', `위험 발언 ${report.risk_count}회 · ${date(report.updated_at)}`));
      row.addEventListener('click', () => openReport(report.id)); $('reportList').append(row);
    }
    for (const record of conversations.items) {
      const row = element('button', 'teacher-row'); const top = element('div', 'teacher-row-header');
      top.append(element('span', '', record.alias), element('span', 'pill', `${record.mode === 'mock' ? '데모 · ' : ''}${record.status === 'active' ? '진행 중' : '보관됨'}`));
      row.append(top, element('small', '', `위험 발언 ${record.safety.risk_count}회 · ${date(record.updated_at)}`));
      row.addEventListener('click', () => openConversation(record.id)); $('conversationList').append(row);
    }
    if (!reports.items.length) $('reportList').append(element('p', 'teacher-empty', '등록된 교사 보고가 없습니다.'));
    if (!conversations.items.length) $('conversationList').append(element('p', 'teacher-empty', '저장된 상담이 없습니다.'));
    $('loginForm').hidden = true; $('dashboard').hidden = false; $('logout').hidden = false;
    status(`${date(new Date().toISOString())} 갱신 · 3초마다 목록을 확인합니다. 보고함 등록과 교사의 실제 확인은 구분됩니다.`);
  } catch (error) {
    if (generation !== teacherState.generation) return;
    if (error.status === 401) logout();
    status(error.message, true);
  } finally { if (generation === teacherState.generation) { teacherState.loading = false; $('refresh').disabled = !teacherState.key; } else teacherState.loading = false; }
}
function renderDetail(record, report = null) {
  $('recordDetail').hidden = false; $('detailTitle').textContent = record.alias + ' · 상담 기록';
  $('detailMode').textContent = record.mode === 'mock' ? '데모 기록' : 'BAZE 기록';
  teacherState.reportID = report?.id || null; $('acknowledge').hidden = !report || report.status === 'acknowledged';
  const body = $('detailBody'); body.replaceChildren();
  const overview = element('section', 'teacher-detail-section');
  overview.append(element('h3', '', record.safety.immediate ? '즉시 안전 확인이 필요한 신호' : '상담 현황'),
    element('p', '', `시작: ${date(record.created_at)}\n종료: ${date(record.ended_at)}\n서로 다른 위험 발언: ${record.safety.risk_count}회\n보고: ${record.safety.reported ? '교사 확인함 등록' : '자동 보고 기준 미충족'}\n학생 신원: 익명 별칭 · 실제 신원 확인 안 됨`));
  body.append(overview);
  const summaries = element('section', 'teacher-detail-section'); summaries.append(element('h3', '', '상담 요약'));
  const grid = element('div', 'teacher-summary-grid');
  for (const variant of ['quality', 'economy']) {
    const model = record.summary.model_summaries?.[variant]; const column = element('div');
    column.append(element('strong', '', labels[variant]), element('p', '', model?.summary || '모델 요약이 아직 없거나 생성에 실패했습니다. 아래 학생 발언을 직접 확인하세요.')); grid.append(column);
  }
  summaries.append(grid); body.append(summaries);
  const risks = element('section', 'teacher-detail-section'); risks.append(element('h3', '', '위험 신호와 발언 근거'));
  if (!record.risk_events.length) risks.append(element('p', '', '기록된 위험 신호 없음 · 안전을 보증하는 결과는 아닙니다.'));
  for (const event of record.risk_events) {
    risks.append(element('p', '', `${event.immediate ? '즉시 확인 · ' : ''}${kinds[event.kind] || event.kind} · ${event.reason}`));
    for (const quote of event.evidence) risks.append(element('blockquote', '', quote));
  }
  body.append(risks);
  const transcript = element('section', 'teacher-detail-section'); transcript.append(element('h3', '', '확인한 대화 기록'));
  for (const [index, turn] of record.turns.entries()) {
    const block = element('article', 'teacher-chat-turn'); block.append(element('h4', '', `${index + 1}번째 발언 · ${date(turn.created_at)}`), element('p', 'student-line', turn.text));
    for (const variant of ['quality', 'economy']) {
      const result = turn.results[variant]; const line = element('div', 'teacher-model-line');
      line.append(element('strong', '', labels[variant]), element('p', '', result?.status === 'ok' ? result.reply : result?.error || '응답 대기 또는 미완료')); block.append(line);
    }
    transcript.append(block);
  }
  body.append(transcript); $('recordDetail').scrollIntoView({behavior: 'smooth', block: 'start'});
}
async function openReport(id) {
  const generation = teacherState.generation;
  try { const report = await api('/reports/' + encodeURIComponent(id)); if (generation === teacherState.generation) renderDetail(report.conversation, report); }
  catch (error) { if (generation === teacherState.generation) status(error.message, true); }
}
async function openConversation(id) {
  const generation = teacherState.generation;
  try { const record = await api('/conversations/' + encodeURIComponent(id)); if (generation === teacherState.generation) renderDetail(record); }
  catch (error) { if (generation === teacherState.generation) status(error.message, true); }
}
$('loginForm').addEventListener('submit', async event => {
  event.preventDefault(); teacherState.key = $('teacherKey').value.trim(); $('teacherKey').value = ''; $('loginButton').disabled = true;
  try { await refresh(); if (teacherState.key) { clearInterval(teacherState.timer); teacherState.timer = setInterval(refresh, 3000); } }
  finally { $('loginButton').disabled = false; }
});
$('refresh').addEventListener('click', refresh);
$('logout').addEventListener('click', () => { logout(); status('교사 접속을 종료했습니다. 저장된 상담 기록은 유지됩니다.'); });
$('acknowledge').addEventListener('click', async () => {
  const id = teacherState.reportID; if (!id) return; $('acknowledge').disabled = true;
  try { await api('/reports/' + encodeURIComponent(id) + '/acknowledge', 'POST'); await refresh(); await openReport(id); }
  catch (error) { status(error.message, true); }
  finally { $('acknowledge').disabled = false; }
});
window.addEventListener('beforeunload', () => { clearInterval(teacherState.timer); teacherState.key = ''; });
