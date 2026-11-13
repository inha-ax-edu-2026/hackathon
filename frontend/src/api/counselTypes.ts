/**
 * 상담 API 계약 타입.
 * 출처: .scratch/ai-chatbot-consult/backend-api-proposal.md 3절(데이터 모양)·6절(엔드포인트).
 * backend가 단일 출처이므로, backend가 이름을 바꿔 확정하면 이 파일을 거기에 맞춘다.
 * 필드 이름은 backend 관례대로 snake_case, 시각은 ISO 8601 문자열이다.
 */

/** 상담 건의 종류. AI 챗봇 상담 또는 개인상담(시드용). */
export type CaseKind = 'chatbot' | 'individual'

/** 상담상태 7종. 화면 표기는 `@/lib/counsel/labels`의 CASE_STATUS_LABEL. */
export type CaseStatus =
  | 'in_progress' // AI 챗봇 상담 진행 중. 학생 목록 「상담중」, 교사 목록에 없음
  | 'awaiting_approval' // 승인대기 (전환 직후)
  | 'awaiting_counsel' // 상담대기 (교사 승인 뒤)
  | 'completed' // 상담종료
  | 'in_counsel' // 상담중 (개인상담 시드만)
  | 'awaiting_confirmation' // 확인대기 (개인상담 시드만)
  | 'canceled' // 상담취소 (개인상담 시드만)

export type Risk = 'low' | 'medium' | 'high'

/** 전환 사유: 키워드 감지 또는 학생 요청(「선생님과 상담하기」 버튼). */
export type HandoffReason = 'keyword' | 'student_request'

/** 개인상담 방식. AI 챗봇 상담 건은 null. */
export type CounselMethod = '대면' | '화상' | '전화'

export type Student = {
  grade: number
  class: number
  number: number
  name: string
}

export type Handoff = {
  reason: HandoffReason
  detected_keywords: string[]
  at: string
}

/** 상담 건. 「개인상담 관리」 목록의 한 줄. */
export type CounselCase = {
  id: string
  kind: CaseKind
  status: CaseStatus
  /** backend가 만든다. AI 챗봇 상담은 「[AI 챗봇] {topic} 상담」. */
  title: string
  student: Student
  /** 개인상담 시드만 값이 있다. at이 null이면 화면에서 「일정 미정」 또는 「-」. */
  schedule: { at: string | null; method: CounselMethod | null }
  /** 진행 중이면 null. 전환·종료 시점에 한 번 정한다. */
  risk: Risk | null
  /** 전환되지 않았으면 null. */
  handoff: Handoff | null
  /** 전환 여부와 관계없이 이 건에서 감지된 키워드 전체. */
  detected_keywords: string[]
  /** 교사가 상세를 열었는지. */
  read: boolean
  created_at: string
  updated_at: string
}

/** 상담 양식. 01번(양식) 확정 전이라 질문·답 목록으로 주고받는다. */
export type CounselForm = {
  topic: string
  answers: FormAnswer[]
}

export type FormAnswer = { question: string; answer: string }

export type MessageRole = 'student' | 'bot'

export type Message = {
  id: string
  role: MessageRole
  text: string
  at: string
}

/** 판단 결과. 학생 발화와 「선생님과 상담하기」·끝내기에 같은 모양으로 돌아온다. */
export type Judgment = {
  handed_off: boolean
  /** handed_off가 false면 null. */
  handoff_reason: HandoffReason | null
  /** 지금까지 누적된 감지 키워드. */
  detected_keywords: string[]
  /** 전환·종료 시점에만 값, 진행 중이면 null. */
  risk: Risk | null
}

/** 오류 응답 본문. frontend는 detail을 사용자에게 보여 준다. */
export type ApiErrorBody = {
  detail: string
  fields?: unknown[]
}

// ── 엔드포인트별 요청·응답 (제안서 6절) ──

/** POST /api/student/counsel/cases */
export type CreateCaseRequest = { form: CounselForm }
export type CreateCaseResponse = { case: CounselCase; messages: Message[] }

/** GET /api/student/counsel/cases · GET /api/teacher/counsel/cases */
export type CaseListResponse = { cases: CounselCase[] }

/** GET /api/student/counsel/cases/{id} */
export type StudentCaseDetailResponse = {
  case: CounselCase
  form: CounselForm | null
  messages: Message[]
}

/** POST /api/student/counsel/cases/{id}/messages */
export type SendMessageRequest = { text: string; request_id: string }
export type SendMessageResponse = {
  student_message: Message
  /** 이 발화로 전환되면 null. */
  bot_message: Message | null
  judgment: Judgment
  case: CounselCase
}

/** POST /api/student/counsel/cases/{id}/handoff · .../finish */
export type JudgmentResponse = { judgment: Judgment; case: CounselCase }

/** GET /api/teacher/counsel/cases/{id}. 대화 전문(messages)은 절대 싣지 않는다. */
export type TeacherCaseDetailResponse = {
  case: CounselCase
  /** 전환 요약. 개인상담 시드는 null. */
  summary: string | null
  /** 개인상담 시드는 null. */
  form: CounselForm | null
  /** 사후 서류. 03번 티켓에서 모양을 정한다. */
  documents: null
}

/** POST /api/teacher/counsel/cases/{id}/read · .../approve */
export type CaseResponse = { case: CounselCase }

/** POST /api/demo/reset */
export type DemoResetResponse = { reset: true }
