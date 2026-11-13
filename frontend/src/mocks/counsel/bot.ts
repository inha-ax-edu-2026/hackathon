import type { CounselForm, HandoffReason, Message, Risk } from '@/api/counselTypes.ts'
import { DEMO_STUDENT } from '@/lib/counsel/identity.ts'
import { HANDOFF_REASON_LABEL, RISK_LABEL } from '@/lib/counsel/labels.ts'
import { KEYWORDS } from './judgment.ts'

/**
 * 목 AI 챗봇: 첫 인사, 발화마다의 답, 전환 요약. 실제로는 backend가 AI로 만든다(제안서 5절).
 * 말투·질문은 backend 프롬프트 몫이라 여기서는 시연에 충분한 고정 문구만 둔다.
 */

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

const ACKS = ['그랬구나.', '말해줘서 고마워.', '그런 마음이었겠다.', '이해해.']

const clip = (text: string, n: number) => (text.length > n ? `${text.slice(0, n)}…` : text)

const followups = (form: CounselForm) => FOLLOWUPS[form.topic] ?? FOLLOWUPS.기타

/** 양식에서 질문 문구에 `hint`가 든 항목의 답. 양식이 확정되기 전이라 질문 문구로 찾는다. */
const answerOf = (form: CounselForm, hint: string) =>
  form.answers.find((a) => a.question.includes(hint) && a.answer.trim())?.answer.trim() ?? null

export function greeting(form: CounselForm) {
  const concern = answerOf(form, '어떤 고민')
  const opening = concern
    ? `양식에 "${clip(concern, 36)}"라고 적어 줬네. 이야기해 줘서 고마워.`
    : `${form.topic} 이야기를 하고 싶구나. 와 줘서 고마워.`
  return `안녕, ${DEMO_STUDENT.name}! ${opening} 편하게 말해 줘도 돼.\n${followups(form)[0]}`
}

/** 학생이 선생님과 직접 이야기하고 싶다는 뜻을 보였는지. 전환으로 해석하지 않고 버튼만 안내한다. */
function asksForTeacher(text: string) {
  const t = text.replace(/\s+/g, '')
  const teacher = ['선생님', '쌤', '담임'].some((w) => t.includes(w))
  const talk = ['얘기', '이야기', '상담', '말하', '만나', '도와', '연결'].some((w) => t.includes(w))
  return teacher && talk
}

/** studentTurns: 이번 발화까지 포함한 학생 발화 수 */
export function reply(form: CounselForm, text: string, studentTurns: number) {
  if (asksForTeacher(text)) {
    return '선생님과 직접 이야기하고 싶구나. 화면 위의 「선생님과 상담하기」 버튼을 누르면 담임 선생님께 전달돼. 그 전까지는 나랑 계속 이야기해도 괜찮아.'
  }
  const list = followups(form)
  return `${ACKS[(studentTurns - 1) % ACKS.length]} ${list[studentTurns % list.length]}`
}

type SummarySource = {
  form: CounselForm
  messages: Message[]
  keywords: string[]
  /** null이면 전환 없이 끝낸 상담 */
  reason: HandoffReason | null
  risk: Risk
}

const keywordList = (keywords: string[]) => keywords.map((k) => `'${k}'`).join(', ')

/** 양식에서 고른 답(기분 점수·기간)만 옮기고, 학생이 직접 쓴 글은 인용하지 않는다. */
function formSentence(form: CounselForm) {
  const mood = answerOf(form, '기분')
  const duration = answerOf(form, '기간')
  const parts = [
    mood && `지금 기분을 5점 중 ${mood}점으로 답했`,
    duration && `고민이 ${duration} 이어졌다고 했`,
  ].filter(Boolean)
  if (parts.length === 0) return null
  return `상담 양식에서 ${parts.join('고, ')}다.`
}

/** 감지 키워드를 심각·경미로 나눠 이름만 든다. 학생 발화 문장은 옮기지 않는다. */
function keywordSentence(keywords: string[], studentTurns: number) {
  if (studentTurns === 0) return '대화에서 학생이 직접 한 말은 없다.'
  if (keywords.length === 0) return `학생 발화 ${studentTurns}번에서 감지 키워드는 없었다.`
  const severe = keywords.filter((k) => KEYWORDS.severe.includes(k))
  const mild = keywords.filter((k) => !KEYWORDS.severe.includes(k))
  const groups = [
    severe.length > 0 && `심각: ${keywordList(severe)}`,
    mild.length > 0 && `경미: ${keywordList(mild)}`,
  ].filter(Boolean)
  return `학생 발화 ${studentTurns}번에서 키워드가 감지되었다(${groups.join(' / ')}).`
}

const REASON_SENTENCE: Record<HandoffReason, string> = {
  keyword: '키워드 기준에 따라 개인상담으로 바로 전환되었다.',
  student_request: '학생이 「선생님과 상담하기」를 눌러 선생님과의 상담을 직접 요청했다.',
}

/**
 * 전환 요약. 학생 발화를 그대로 옮기지 않고 주제·양식 답·감지 키워드·전환 사유·위험도로 풀어 쓴다.
 * 학생이 말하지 않은 사실은 만들지 않는다.
 */
function aiSummary({ form, messages, keywords, reason, risk }: SummarySource) {
  const studentTurns = messages.filter((m) => m.role === 'student').length
  return [
    `학생은 ${form.topic} 고민으로 AI 챗봇 상담을 시작했다.`,
    formSentence(form),
    keywordSentence(keywords, studentTurns),
    reason ? REASON_SENTENCE[reason] : '학생이 전환 없이 상담을 끝냈다.',
    `위험도는 ${RISK_LABEL[risk]}으로 판단했다.`,
  ]
    .filter(Boolean)
    .join(' ')
}

/** AI 요약이 실패하면 쓰는 고정 틀 요약. 전환은 AI 장애에 막히지 않는다(제안서 5.2). */
function fallbackSummary({ form, keywords, reason, risk }: SummarySource) {
  return [
    `주제: ${form.topic}`,
    `전환 사유: ${reason ? HANDOFF_REASON_LABEL[reason] : '전환 없음'}`,
    `위험도: ${RISK_LABEL[risk]}`,
    `감지 키워드: ${keywords.length > 0 ? keywords.join(', ') : '없음'}`,
  ].join(' / ')
}

export function summarize(source: SummarySource) {
  try {
    return aiSummary(source)
  } catch {
    return fallbackSummary(source)
  }
}
