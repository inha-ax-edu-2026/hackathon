/**
 * 학교폭력 사안 API 계약 타입(제안 계약, ADR 0002).
 * backend에는 사안 단위 API가 없어 프론트가 먼저 제안한다. 칸·인용·검토 형식은 backend
 * `/api/teacher/document-drafts`를 재사용하고, backend가 확정하면 이 파일을 거기에 맞춘다.
 * 상담 계약(`counselTypes.ts`)과는 다른 도메인이라 파일을 나눈다.
 * 필드 이름은 snake_case, 시각은 ISO 8601 문자열이다.
 */

/** 처리 단계. 저장하지 않고 서류 상태에서 계산한다(1-3 승인 전 접수, 2-4 승인 전 조사, 그 뒤 심의). */
export type SchoolViolenceStage = 'intake' | 'investigation' | 'review'

/** 관련 학생 구분. 사실이 확정되기 전이라 「관련」을 붙인다. */
export type RelatedRole = 'victim' | 'offender' | 'witness'

export type GuardianNotice = {
  notified: boolean
  /** 통보 일시. 통보하지 않았거나 모르면 null. */
  at: string | null
  /** 예: 「유선」 */
  method: string | null
}

/** 관련 학생. */
export type RelatedStudent = {
  name: string
  grade: number
  class: number
  number: number
  gender: 'male' | 'female'
  role: RelatedRole
  guardian_notice: GuardianNotice
  /** 장애학생·이주배경학생 등 비고. 없으면 null. */
  note: string | null
  /** 조사 중에 확인된 학생이면 true. 접수 때부터 사안 정보에 들어 있어도 표시만 달리한다. */
  found_during_investigation: boolean
}

/** 분리 시행 여부·기간·예외 사유. 아직 정하지 않았으면 enforced가 null이다. */
export type Separation = {
  enforced: boolean | null
  period: string | null
  exception_reasons: string[]
}

/** 사안 정보. 여러 학폭 서류가 같은 값을 가져다 쓰므로 사안에 한 번만 둔다. */
export type SchoolViolenceInfo = {
  school_name: string
  /** 자동으로 붙지만 나중에 고칠 수 있다. 학교마다 번호 규칙이 다르다. */
  case_number: string
  received_at: string
  teacher_name: string
  vice_principal: string
  students: RelatedStudent[]
  separation: Separation
}

/** 사안 자료 종류 4종. */
export type MaterialKind =
  | 'counsel_record'
  | 'statement'
  | 'interview_transcript'
  | 'student_record'

/** 사안 자료. 학폭 서류 초안의 근거가 되는 원문. */
export type SchoolViolenceMaterial = {
  id: string
  kind: MaterialKind
  title: string
  /** 원문. 서류 칸의 인용문은 이 글의 부분 문자열이다. */
  body: string
  /** 이 자료가 붙는 단계. */
  stage: SchoolViolenceStage
  /** 조사 중에 모일 자료를 시연 때문에 접수 직후 미리 넣어 둔 것이면 true. */
  demo_preloaded: boolean
  /** 상담 기록이면 연결된 상담 건 ID. */
  counsel_case_id: string | null
}

/** 서류 상태. 「초안 없음」은 아직 칸이 만들어지지 않은 상태다. */
export type DocumentStatus = 'none' | 'reviewing' | 'approved'

/**
 * 칸 처리 방식(backend 분류). 화면 구분: narrative는 AI 칸, admin은 「사안 정보에서 가져옴」,
 * manual·sensitive는 판단 칸. backend 응답에는 없고 프론트가 제안해 응답에 싣는다.
 */
export type FieldKind = 'narrative' | 'admin' | 'manual' | 'sensitive'

/** 근거 인용. quote는 해당 자료 body의 부분 문자열이다. */
export type Evidence = { source_id: string; quote: string }

/**
 * 칸. backend document-drafts의 칸 형식(id·label·value·evidence·reviewed·edited)에 kind만 더했다.
 * 반복 구조(쟁점 n개, 가해 관련 학생별 판단요소)는 칸 id를 `issue.1.victim_claim`처럼 나눠 표현한다.
 */
export type DocumentField = {
  id: string
  label: string
  kind: FieldKind
  value: string
  evidence: Evidence[]
  reviewed: boolean
  /** 교사가 고쳤는지. 고치면 검토가 풀리지만 기존 인용은 남는다. */
  edited: boolean
}

/**
 * 서류 칸 집계(효과 숫자). 서버가 센 값을 그대로 보인다.
 * 「AI 작성 {ai}칸 / 전체 {total}칸 · 판단 칸 {judgement_remaining}개 남음」
 */
export type DocumentCounts = {
  /** 서류 칸 전체(처리 방식 상관없이). */
  total: number
  /** AI가 쓴 칸(narrative 중 값이 있거나 교사가 비운 칸). */
  ai: number
  /** 그중 교사가 검토 표시를 한 칸. */
  ai_reviewed: number
  /** 사안 정보에서 가져온 칸(admin). */
  info: number
  /** 판단 칸 전체(manual·sensitive). */
  judgement: number
  /** 판단 칸 중 아직 비어 있는 칸. 승인한 뒤에도 남을 수 있다. */
  judgement_remaining: number
}

/** 사안 서류 한 장의 요약. 서류 9종 체크리스트의 한 줄이다. */
export type SchoolViolenceDocumentSummary = {
  /** 가이드북 서식 번호. 예: 「1-3」 */
  form_id: string
  name: string
  stage: SchoolViolenceStage
  /** 작성 주체. 예: 「책임교사」 */
  author: string
  author_note: string | null
  /** 결재·확인. 예: 「학교장 결재」 */
  approval: string
  /** 제출처 등 보조 설명. 예: 「→ 교육(지원)청 보고 (48시간 안)」 */
  approval_note: string | null
  /** 이번 시연에서 작업할 수 있는지. false면 「시연 범위 밖」으로 잠근다. */
  available: boolean
  /**
   * 작업할 수 있는 서류인데 지금은 초안을 만들 수 없는 이유. 없으면 null.
   * 예: 2-4는 조사 자료(진술서·면담 전사)가 없으면 잠긴다. 초안 생성도 409로 거절한다.
   */
  locked_reason: string | null
  /** 서류에 대한 한 줄 설명. 화면에서는 잠긴 서류에만 보조 설명으로 쓴다. */
  description: string
  status: DocumentStatus
  /** 칸을 저장할 때마다 오른다. 오래된 개정으로 저장하면 409. */
  revision: number
  /** 칸 집계. 초안이 없으면 null. */
  counts: DocumentCounts | null
}

/** 서류 상세: 요약에 칸 목록이 붙는다. 초안이 없으면 fields가 비어 있다. */
export type SchoolViolenceDocument = SchoolViolenceDocumentSummary & {
  fields: DocumentField[]
}

/** 서류 진행률. 이번 시연에서 작업할 수 있는 서류 중 승인한 수 / 작업 가능한 서류 수. */
export type DocumentProgress = { approved: number; total: number }

/** 사안 상세. */
export type SchoolViolenceCase = {
  id: string
  stage: SchoolViolenceStage
  info: SchoolViolenceInfo
  materials: SchoolViolenceMaterial[]
  documents: SchoolViolenceDocumentSummary[]
  progress: DocumentProgress
  /** 사안 자료로 연결된 상담 건 ID. 상담 건은 사안에 최대 하나 연결된다. */
  counsel_case_ids: string[]
  created_at: string
}

/** 사안 목록의 한 줄. */
export type SchoolViolenceCaseListItem = {
  id: string
  stage: SchoolViolenceStage
  case_number: string
  received_at: string
  students: RelatedStudent[]
  progress: DocumentProgress
}

// ── 엔드포인트별 요청·응답 ──

/** GET /api/teacher/school-violence/cases */
export type SchoolViolenceCaseListResponse = { cases: SchoolViolenceCaseListItem[] }

/** 접수 직후 미리 붙일 수 있는 시연용 조사 자료 종류. */
export type DemoMaterialKind = Extract<MaterialKind, 'statement' | 'interview_transcript'>

/**
 * POST /api/teacher/school-violence/cases. 이미 연결된 상담 건이면 409.
 * demo_material_kinds: 접수 직후 미리 붙일 시연용 조사 자료(demo_preloaded)의 종류. 보내지 않으면 모두 붙인다.
 * 빈 배열이면 조사 자료 없이 접수해 2-4가 잠긴 사안을 만들 수 있다. 허용 종류가 아니면 422.
 */
export type IntakeSchoolViolenceCaseRequest = {
  counsel_case_id: string
  demo_material_kinds?: DemoMaterialKind[]
}

/** GET /api/teacher/school-violence/cases/{id} · POST .../cases */
export type SchoolViolenceCaseResponse = { case: SchoolViolenceCase }

/**
 * POST /api/teacher/school-violence/cases/{id}/documents/{form_id}/draft
 * 「AI 초안 만들기」. 이미 초안이 있으면 고친 내용이 지워지므로 overwrite_confirmed: true가 있어야 한다.
 * 확인 없이 요청하면 409. 다시 만들면 승인이 풀려 「검토 중」이 된다.
 */
export type GenerateDocumentDraftRequest = { overwrite_confirmed?: boolean }

/** GET .../documents/{form_id} · POST .../documents/{form_id}/draft */
export type SchoolViolenceDocumentResponse = { document: SchoolViolenceDocument }

/**
 * 칸 하나의 수정. value는 칸을 고칠 때, reviewed는 검토 표시를 바꿀 때만 보낸다(둘 다 가능).
 * - AI 칸의 value를 바꾸면 검토 표시가 풀리고 교사 수정 표시가 붙는다(같이 보낸 reviewed는 무시).
 * - reviewed는 값이 있는 AI 칸에만 보낼 수 있다. 판단 칸·사안 정보 칸이면 422.
 * - 사안 정보 칸(admin)의 value는 서류에서 고칠 수 없다(422). 최대 6000자.
 */
export type SaveDocumentFieldEdit = { id: string; value?: string; reviewed?: boolean }

/**
 * POST .../documents/{form_id}/save
 * 바꾼 칸만 보낸다. 요청 revision이 저장된 revision과 다르면 409(다른 창에서 수정됨).
 * 초안이 없는 서류는 409, 없는 칸 id·잘못된 수정은 422. 성공하면 revision이 1 오른 서류 전체를 준다.
 * 승인한 서류도 저장할 수 있다. 저장 뒤 AI 칸에 검토하지 않은 칸이 생기면 상태가 「검토 중」으로 돌아간다.
 */
export type SaveDocumentRequest = { revision: number; fields: SaveDocumentFieldEdit[] }

/**
 * POST .../documents/{form_id}/approve
 * AI 칸(값이 있거나 교사가 비운 narrative)이 모두 검토됐을 때만 성공한다(아니면 409). 판단 칸이 비어 있어도 승인된다.
 * revision이 오래됐으면 409. 승인은 결재·제출이 아니다. 응답은 서류 전체이고 revision은 그대로다.
 */
export type ApproveDocumentRequest = { revision: number }

/**
 * PATCH /api/teacher/school-violence/cases/{id}/info → SchoolViolenceCaseResponse
 * 사안 정보 수정. 보낸 항목만 바뀌고, `students`·`separation`은 통째로 바꾼다.
 * 학교명·접수 일시는 고치지 않는다. 관련 학생은 이름이 구별 기준이라 이름이 겹치면 422다.
 * 서류의 사안 정보 칸(admin)은 읽을 때 사안 정보에서 가져오므로 이미 만든 서류에도 바로 반영된다.
 */
export type UpdateSchoolViolenceInfoRequest = Partial<
  Pick<
    SchoolViolenceInfo,
    'case_number' | 'teacher_name' | 'vice_principal' | 'students' | 'separation'
  >
>
