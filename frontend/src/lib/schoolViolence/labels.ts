import type {
  DocumentStatus,
  GuardianNotice,
  MaterialKind,
  RelatedRole,
  RelatedStudent,
  SchoolViolenceStage,
} from '@/api/schoolViolenceTypes.ts'
import { formatDateTime } from '@/lib/counsel/format.ts'

/** 학교폭력 사안 화면 표기. 「가해자」·「피해자」는 쓰지 않는다(사실이 확정되기 전이라 「관련」을 붙인다). */

/** 단계 표시 순서와 이름 */
export const STAGES: SchoolViolenceStage[] = ['intake', 'investigation', 'review']

export const STAGE_LABEL: Record<SchoolViolenceStage, string> = {
  intake: '접수',
  investigation: '조사',
  review: '심의',
}

export const ROLE_LABEL: Record<RelatedRole, string> = {
  victim: '피해 관련',
  offender: '가해 관련',
  witness: '목격',
}

/** 서류 양식의 비고 칸 표기. 양식 원문이 「가해(관련)」처럼 괄호를 쓴다. */
export const ROLE_FORM_LABEL: Record<RelatedRole, string> = {
  victim: '피해(관련)',
  offender: '가해(관련)',
  witness: '목격',
}

export const MATERIAL_KIND_LABEL: Record<MaterialKind, string> = {
  counsel_record: '상담 기록',
  statement: '진술서',
  interview_transcript: '면담 전사',
  student_record: '학적 정보',
}

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  none: '초안 없음',
  reviewing: '검토 중',
  approved: '승인',
}

export const GENDER_LABEL: Record<RelatedStudent['gender'], string> = {
  male: '남',
  female: '여',
  unknown: '미확인',
}

/** 「11.13. 유선」, 통보하지 않았으면 「미통보」 */
export function guardianNoticeLabel({ notified, at, method }: GuardianNotice) {
  if (!notified) return '미통보'
  const date = at ? formatDateTime(at).slice(5, 10) : null
  return [date ? `${date}.` : null, method].filter(Boolean).join(' ') || '통보함'
}
