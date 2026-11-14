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
  /**
   * 학생이 AI 챗봇과 계속 대화할 수 있는지. 학생이 「선생님과 상담하기」·「상담 끝내기」를 눌러야만 false가 된다.
   * 키워드 감지로 교사에게 알림이 가도(승인대기) true로 남는다. 개인상담 시드는 false.
   */
  chat_open: boolean
  created_at: string
  updated_at: string
}

/** 상담 양식. 주제와 질문·답 목록으로 주고받는다. */
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
  /** 챗봇 답. 키워드로 교사에게 알림이 가도 대화는 이어지므로 늘 있다. */
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
  /** 사후 서류. 전환된 건에만 있고, 종료 건·개인상담 시드는 null. */
  documents: CaseDocuments | null
  /** 이 상담 건에서 접수한 학교폭력 사안 ID. 접수하지 않았으면 null(사안 계약은 schoolViolenceTypes.ts). */
  school_violence_case_id: string | null
  /** 학폭 권고. 권고는 참고용이며 사안을 만들지 않는다(접수는 교사만). */
  school_violence_recommendation: SchoolViolenceRecommendation
}

/** 감지 키워드 중 학교폭력 관련 키워드가 있으면 recommended=true, keywords는 그 근거(감지된 키워드 문자열 그대로). */
export type SchoolViolenceRecommendation = {
  recommended: boolean
  keywords: string[]
}

// ── 사후 서류 (명세 「사후 서류」, 제안서 7절) ──

/** 서류 종류 4종. 화면 순서도 이 순서다. */
export type DocumentKind = 'counsel_log' | 'student_record' | 'parent_notice' | 'crisis_report'

/** 서류 하나. 추천 여부·근거는 위험도 규칙이 정하고(AI가 아님), 선택·본문·승인은 교사가 바꾼다. */
export type CounselDocument = {
  kind: DocumentKind
  /** 서류 이름. 예: 「상담일지」 */
  title: string
  /** 받는 대상. 예: 「교사 보관용」 */
  audience: string
  recommended: boolean
  /** 추천 여부의 근거 한 줄. 추천하지 않을 때도 이유를 준다. */
  recommend_reason: string
  /** 초안 본문. 전환 시점에 만들어지고 교사가 고칠 수 있다. */
  draft: string
  /** 교사가 고른 서류인지. 처음에는 recommended와 같다. */
  selected: boolean
  /** 교사가 검토 완료로 승인했는지. 본문을 고치면 다시 false가 된다. */
  approved: boolean
}

export type CaseDocuments = {
  /** 4종 모두, 고정 순서. */
  items: CounselDocument[]
  /** 절감 분 = 선택한 서류 수 × (manual − review). 승인 여부와 무관하다. */
  saved_minutes: number
  /** 절감 근거(가정치): 서류 하나를 직접 쓰면 8분, 초안을 검토하면 1분. */
  manual_minutes_per_document: number
  review_minutes_per_document: number
  /** 선택한 서류가 1개 이상이고 모두 승인되었는지. 화면의 「승인 완료」. */
  all_approved: boolean
}

/** PATCH /api/teacher/counsel/cases/{id}/documents/{kind}. 둘 다 선택 사항이고 하나는 있어야 한다. */
export type UpdateDocumentRequest = { selected?: boolean; draft?: string }

/** PATCH .../documents/{kind} · POST .../documents/{kind}/approve */
export type DocumentsResponse = { documents: CaseDocuments }

/** POST /api/teacher/counsel/cases/{id}/read · .../approve */
export type CaseResponse = { case: CounselCase }

/** POST /api/demo/reset */
export type DemoResetResponse = { reset: true }
