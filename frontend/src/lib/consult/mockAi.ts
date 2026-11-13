/**
 * 목 AI — 챗봇 응답·요약·서류 초안 생성. 백엔드 상담 API 스펙이 정해지기 전까지 쓰는 임시 구현이다.
 * 스펙이 나오면 이 파일의 함수들을 apiFetch 호출로 바꾼다.
 */
import {
  type DocItem,
  detect,
  type FormValues,
  type HandoffReason,
  type KeywordConfig,
  type Msg,
  type Risk,
  type State,
  type Summary,
} from '@/lib/consult/model'

const FOLLOWUPS: Record<string, string[]> = {
  학업: [
    '어떤 과목이나 상황에서 가장 막막하게 느껴져?',
    '공부할 때 제일 먼저 막히는 순간이 언제야?',
    '지금까지 해본 방법 중에 조금이라도 도움이 된 게 있어?',
    '선생님이나 친구에게 도움을 요청해본 적은 있어?',
  ],
  진로: [
    '요즘 어떤 게 제일 궁금하거나 고민돼?',
    '좋아하거나 잘한다고 느끼는 활동이 있어?',
    '그 고민을 가족이나 친구와 이야기해본 적 있어?',
    '앞으로 한 달 안에 해보고 싶은 작은 시도가 있다면?',
  ],
  교우관계: [
    '그 일이 언제부터 시작됐는지 말해줄 수 있어?',
    '그때 어떤 기분이 들었어?',
    '그런 일이 반복되고 있어, 아니면 한두 번이었어?',
    '지금 곁에서 힘이 되어주는 사람이 있어?',
  ],
  가정: [
    '집에서 가장 신경 쓰이는 일이 뭐야?',
    '그 일 때문에 학교생활에도 영향이 있어?',
    '그 얘기를 편하게 할 수 있는 사람이 있어?',
    '지금 가장 필요한 도움이 뭐라고 생각해?',
  ],
  마음·건강: [
    '요즘 잠은 잘 자고 있어?',
    '그런 기분이 하루 중 언제 가장 심해져?',
    '기분이 나아졌던 순간이 있었다면 언제였어?',
    '혼자 감당하기 어렵다고 느낀 적 있어?',
  ],
  기타: [
    '조금 더 자세히 이야기해줄 수 있어?',
    '그 일이 너한테 어떤 영향을 주고 있어?',
    '지금 가장 바라는 건 뭐야?',
    '선생님께 꼭 전하고 싶은 말이 있어?',
  ],
}

export function greeting(f: FormValues): string {
  const first = (FOLLOWUPS[f.topic] ?? FOLLOWUPS.기타)[0]
  const c = f.concern.length > 36 ? `${f.concern.slice(0, 36)}…` : f.concern
  return `안녕, ${f.name}! 양식에 "${c}" 라고 적어줬네. 이야기해줘서 고마워. 편하게 말해줘도 돼.\n${first}`
}

export function botReply(f: FormValues, studentTurns: number): string {
  const list = FOLLOWUPS[f.topic] ?? FOLLOWUPS.기타
  const next = list[studentTurns % list.length]
  const ack = ['그랬구나.', '말해줘서 고마워.', '그런 마음이었겠다.', '이해해.'][studentTurns % 4]
  return `${ack} ${next}`
}

const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n)}…` : t)

export function summarize(
  f: FormValues,
  msgs: Msg[],
  cfg: KeywordConfig,
  reason: HandoffReason | null,
): Summary {
  const det = detect(msgs, cfg)
  const risk: Risk =
    det.severe.length > 0 ? 'high' : det.count >= cfg.threshold || reason ? 'medium' : 'low'
  const said = msgs.filter((m) => m.role === 'student').slice(-3)
  const bullets = [
    `양식: 기분 ${f.mood}/5 · 지속 기간 ${f.duration || '미입력'}`,
    `핵심 고민: ${clip(f.concern, 60)}`,
    ...said.map((m) => `학생 발언: "${clip(m.text, 44)}"`),
  ]
  const kws = [...det.severe, ...new Set(det.mild)]
  if (kws.length) bullets.push(`감지 키워드: ${kws.join(', ')}`)
  if (reason)
    bullets.push(
      reason === 'student' ? '전환 사유: 학생이 직접 요청' : '전환 사유: 키워드 조건 충족',
    )
  return { headline: `${f.name}(${f.classInfo || '학급 미입력'}) · ${f.topic} 상담`, bullets, risk }
}

// ---------- 서류 파이프라인 (시연용 몇 가지 케이스) ----------

const today = () => new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
export const nowLabel = () =>
  new Date().toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export function buildDocs(s: State): DocItem[] {
  const f = s.form
  const sum = s.summary
  const risk = sum?.risk ?? 'low'
  const via = s.handoff
    ? `AI 챗봇 상담 → 개인 비대면 상담 전환 (${s.handoff.reason === 'student' ? '학생 요청' : '키워드 감지'})`
    : 'AI 챗봇 상담'
  const body = (sum?.bullets ?? []).map((b) => `- ${b}`).join('\n')
  return [
    {
      id: 'log',
      title: '상담일지',
      audience: '교사 보관용',
      selected: true,
      reason: '모든 상담에 필수',
      text: `[상담일지]\n일시: ${today()}\n학생: ${f.name} (${f.classInfo})\n상담 방식: ${via}\n주제: ${f.topic}\n\n상담 요약\n${body}\n\n후속 조치(교사 작성): `,
    },
    {
      id: 'record',
      title: '학생부 상담 기록 초안',
      audience: '학교생활기록부 누가기록',
      selected: true,
      reason: '모든 상담 기록 (최종 반영은 교사 판단)',
      text: `${f.classInfo} ${f.name}: ${f.topic} 관련 고민으로 상담을 진행함. 정서적 어려움을 표현하였으며 지속적인 관심과 지지가 필요하다고 판단됨.`,
    },
    {
      id: 'parent',
      title: '학부모 안내문',
      audience: '보호자',
      selected: risk !== 'low',
      reason: risk !== 'low' ? '위험도 보통 이상 → 보호자 안내 권장' : '위험도 낮음 → 해당 없음',
      text: `안녕하세요, ${f.name} 학생 담임입니다.\n최근 ${f.name} 학생과 학교생활 관련 상담을 진행하였기에 안내드립니다. 자세한 내용은 편하신 시간에 통화로 말씀드리겠습니다. 가정에서도 따뜻한 관심 부탁드립니다.`,
    },
    {
      id: 'crisis',
      title: '위기 학생 관리 보고서',
      audience: '학교 관리자·상담교사',
      selected: risk === 'high',
      reason: risk === 'high' ? '고위험 키워드 감지 → 즉시 보고' : '고위험 키워드 없음 → 해당 없음',
      text: `[위기 학생 관리 보고 (초안)]\n학생: ${f.name} (${f.classInfo})\n감지 키워드: ${s.handoff?.keywords.join(', ') || '-'}\n조치 필요: 상담교사 연계 및 보호자 연락`,
    },
  ]
}

/** 가정치: 서류 1건 직접 작성 8분 vs 검토 1분. 실측 아님 — 발표 전 교사팀과 근거 확인 필요. */
export const savedMinutes = (docs: DocItem[]) => docs.filter((d) => d.selected).length * 7
