/** 상담 플로우 공용 타입·상수·키워드 감지. */
export type Mode = 'chatbot' | 'inperson' | 'remote'
export type Step = 'mode' | 'form' | 'chat' | 'booked' | 'handoff' | 'docs'
export type Risk = 'low' | 'medium' | 'high'
export type HandoffReason = 'student' | 'keyword'

/** 양식은 예비교사 팀에서 전달 예정(고정 형식). 아래는 임시 필드. */
export type FormValues = {
  name: string
  classInfo: string
  topic: string
  mood: number
  duration: string
  concern: string
  wish: string
}

export type Msg = { id: number; role: 'student' | 'bot' | 'system'; text: string }

export type KeywordConfig = { severe: string[]; mild: string[]; threshold: number }

export type Summary = { headline: string; bullets: string[]; risk: Risk }

export type Handoff = {
  reason: HandoffReason
  keywords: string[]
  at: string
}

export type DocItem = {
  id: string
  title: string
  audience: string
  selected: boolean
  reason: string
  text: string
}

export type Pipeline = { stage: number; docs: DocItem[] }

export type State = {
  step: Step
  mode: Mode | null
  form: FormValues
  slot: string | null
  messages: Msg[]
  typing: boolean
  keywords: KeywordConfig
  handoff: Handoff | null
  summary: Summary | null
  pipeline: Pipeline
  approved: Record<string, boolean>
}

export const TOPICS = ['학업', '진로', '교우관계', '가정', '마음·건강', '기타']
export const DURATIONS = ['며칠', '1~2주', '한 달 이상', '오래전부터']
export const SLOTS = ['11/17(화) 점심시간', '11/18(수) 방과 후 16:30', '11/19(목) 점심시간']
export const PIPELINE_STAGES = ['데이터 수집', '요약·분류', '서류 선택', '초안 생성', '검토 대기']
export const RISK_LABEL: Record<Risk, string> = { low: '낮음', medium: '보통', high: '높음' }

/** 어떤 키워드를 쓸지는 아직 미정 → 임시값. UI에서 바로 고쳐볼 수 있게 상태로 둔다. */
export const DEFAULT_KEYWORDS: KeywordConfig = {
  severe: ['죽고 싶', '자해', '사라지고 싶', '맞았', '폭행', '학교폭력'],
  mild: ['힘들', '무서', '괴롭', '따돌', '왕따', '외로', '가기 싫', '불안'],
  threshold: 3,
}

export const SAMPLE_FORM: FormValues = {
  name: '김하늘',
  classInfo: '2학년 3반',
  topic: '교우관계',
  mood: 2,
  duration: '1~2주',
  concern: '반 친구들이 단톡방에서 나만 빼고 이야기하는 것 같아서 학교 가는 게 힘들어요.',
  wish: '담임 선생님이 아셔도 괜찮을지 잘 모르겠어요.',
}

export const EMPTY_FORM: FormValues = {
  name: '',
  classInfo: '',
  topic: '',
  mood: 3,
  duration: '',
  concern: '',
  wish: '',
}

/** 데모 시연용 학생 발화(마이크 폴백·자동 시연 공용). 3번째 발화에서 키워드 전환이 걸린다. */
export const DEMO_LINES = [
  '친구들이 나만 빼고 단톡방을 만들었어. 너무 힘들어',
  '점심도 혼자 먹어. 학교 가기 싫어',
  '어제는 누가 내 가방을 숨겼어. 괴롭히는 것 같아서 무서워',
]

export const formValid = (f: FormValues) => !!f.name.trim() && !!f.topic && !!f.concern.trim()

// ---------- 키워드 감지 ----------

export function detect(msgs: Msg[], cfg: KeywordConfig) {
  const texts = msgs.filter((m) => m.role === 'student').map((m) => m.text)
  const severe = [...new Set(texts.flatMap((t) => cfg.severe.filter((k) => t.includes(k))))]
  const mild = texts.flatMap((t) => cfg.mild.filter((k) => t.includes(k)))
  return {
    severe,
    mild,
    count: mild.length,
    trigger: severe.length > 0 || mild.length >= cfg.threshold,
  }
}
