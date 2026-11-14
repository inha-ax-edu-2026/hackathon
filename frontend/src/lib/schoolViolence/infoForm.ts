import type {
  RelatedStudent,
  SchoolViolenceInfo,
  UpdateSchoolViolenceInfoRequest,
} from '@/api/schoolViolenceTypes.ts'

/**
 * 사안 정보 편집 양식의 입력 상태. 숫자·일시도 입력창이 다루기 쉬운 글로 들고 있다가
 * 저장할 때 API 모양(`UpdateSchoolViolenceInfoRequest`)으로 바꾼다.
 */

export type StudentDraft = {
  /** 목록 키. 이름이 아직 비어 있는 새 학생도 구별한다. */
  key: string
  /** 이미 사안에 있던 학생이면 true. 이름이 서류에서 학생을 구별하는 기준이라 고치지 못한다. */
  existing: boolean
  name: string
  grade: string
  class: string
  number: string
  gender: RelatedStudent['gender']
  role: RelatedStudent['role']
  notified: boolean
  /** `datetime-local` 값(한국 시간). 예: 「2026-11-13T21:00」 */
  noticeAt: string
  noticeMethod: string
  note: string
  foundDuringInvestigation: boolean
}

export type SeparationChoice = 'unset' | 'enforced' | 'not_enforced'

export type InfoDraft = {
  caseNumber: string
  teacherName: string
  vicePrincipal: string
  students: StudentDraft[]
  separation: SeparationChoice
  separationPeriod: string
  exceptionReasons: string[]
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** ISO 시각 → 입력창 값(한국 시간) */
export const toLocalInput = (iso: string | null) =>
  iso ? new Date(Date.parse(iso) + KST_OFFSET_MS).toISOString().slice(0, 16) : ''

/** 입력창 값(한국 시간) → ISO 시각. 비었으면 null. */
export const fromLocalInput = (value: string) => (value ? `${value}:00+09:00` : null)

let nextKey = 0
const newKey = () => `student-${nextKey++}`

const toStudentDraft = (student: RelatedStudent): StudentDraft => ({
  key: newKey(),
  existing: true,
  name: student.name,
  grade: String(student.grade),
  class: String(student.class),
  number: String(student.number),
  gender: student.gender,
  role: student.role,
  notified: student.guardian_notice.notified,
  noticeAt: toLocalInput(student.guardian_notice.at),
  noticeMethod: student.guardian_notice.method ?? '',
  note: student.note ?? '',
  foundDuringInvestigation: student.found_during_investigation,
})

/** 조사 중에 확인된 학생을 더할 때의 빈 입력. 가해 관련으로 시작한다(2-4에서 학생이 늘어나는 경우). */
export const emptyStudentDraft = (): StudentDraft => ({
  key: newKey(),
  existing: false,
  name: '',
  grade: '',
  class: '',
  number: '',
  gender: 'unknown',
  role: 'offender',
  notified: false,
  noticeAt: '',
  noticeMethod: '',
  note: '',
  foundDuringInvestigation: true,
})

export function toInfoDraft(info: SchoolViolenceInfo): InfoDraft {
  const { enforced, period, exception_reasons } = info.separation
  return {
    caseNumber: info.case_number,
    teacherName: info.teacher_name,
    vicePrincipal: info.vice_principal,
    students: info.students.map(toStudentDraft),
    separation: enforced === null ? 'unset' : enforced ? 'enforced' : 'not_enforced',
    separationPeriod: period ?? '',
    exceptionReasons: exception_reasons,
  }
}

const toStudent = (draft: StudentDraft): RelatedStudent => ({
  name: draft.name.trim(),
  grade: Number(draft.grade),
  class: Number(draft.class),
  number: Number(draft.number),
  gender: draft.gender,
  role: draft.role,
  guardian_notice: draft.notified
    ? {
        notified: true,
        at: fromLocalInput(draft.noticeAt),
        method: draft.noticeMethod.trim() || null,
      }
    : { notified: false, at: null, method: null },
  note: draft.note.trim() || null,
  found_during_investigation: draft.foundDuringInvestigation,
})

/** 저장 요청. 사안 정보 전체를 보내 서버가 값을 검증한다. */
export function toInfoRequest(draft: InfoDraft): UpdateSchoolViolenceInfoRequest {
  const enforced = draft.separation === 'unset' ? null : draft.separation === 'enforced'
  return {
    case_number: draft.caseNumber,
    teacher_name: draft.teacherName,
    vice_principal: draft.vicePrincipal,
    students: draft.students.map(toStudent),
    separation: {
      enforced,
      // 시행할 때만 기간이, 시행하지 않을 때만 예외 사유가 뜻이 있다.
      period: enforced ? draft.separationPeriod.trim() || null : null,
      exception_reasons: enforced === false ? draft.exceptionReasons : [],
    },
  }
}
