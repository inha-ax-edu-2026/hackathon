import type {
  DocumentCounts,
  DocumentField,
  SchoolViolenceDocument,
  SchoolViolenceDocumentSummary,
  SchoolViolenceInfo,
  SchoolViolenceMaterial,
} from '@/api/schoolViolenceTypes.ts'
import { isAiField } from '@/lib/schoolViolence/aiField.ts'
import { formatKoreanDateTime } from '@/lib/schoolViolence/format.ts'
import { joinChoice } from '@/lib/schoolViolence/forms/options.ts'
import { GENDER_LABEL, guardianNoticeLabel, ROLE_LABEL } from '@/lib/schoolViolence/labels.ts'
import { draftLockReason } from './drafts/index.ts'
import type { StoredDocument } from './store.ts'

/**
 * 서류 응답 만들기. 사안 정보 칸(admin)은 저장된 값이 아니라 읽을 때의 사안 정보에서 가져온다.
 * 그래서 사안 정보를 고치면(티켓 05) 이미 만든 서류의 공유 칸도 바로 따라 바뀐다.
 */

/** 사안 정보에서 오는 공유 칸 값. 칸 id → 값. 서류마다 쓰는 칸만 골라 쓴다. */
export function adminValues(info: SchoolViolenceInfo): Record<string, string> {
  const { separation } = info
  const students = info.students
    .map((s) => {
      const notice = guardianNoticeLabel(s.guardian_notice)
      const note = s.note ? ` · ${s.note}` : ''
      return `${s.name} · ${s.grade}학년 ${s.class}반 ${s.number}번 · ${GENDER_LABEL[s.gender]} · ${ROLE_LABEL[s.role]} · 보호자 통보 ${notice}${note}`
    })
    .join('\n')
  return {
    school: info.school_name,
    case_number: info.case_number,
    vice_principal: info.vice_principal,
    teacher: info.teacher_name,
    received_at: formatKoreanDateTime(info.received_at),
    students,
    'separation.enforced':
      separation.enforced === null ? '' : separation.enforced ? 'enforced' : 'not_enforced',
    'separation.period': separation.period ?? '',
    'separation.exceptions': joinChoice(separation.exception_reasons),
  }
}

export function applyInfo(fields: DocumentField[], info: SchoolViolenceInfo): DocumentField[] {
  const values = adminValues(info)
  return fields.map((field) =>
    field.kind === 'admin' && field.id in values ? { ...field, value: values[field.id] } : field,
  )
}

const isJudgement = (field: DocumentField) => field.kind === 'manual' || field.kind === 'sensitive'

export function countFields(fields: DocumentField[]): DocumentCounts {
  const ai = fields.filter(isAiField)
  const judgement = fields.filter(isJudgement)
  return {
    total: fields.length,
    ai: ai.length,
    ai_reviewed: ai.filter((f) => f.reviewed).length,
    info: fields.filter((f) => f.kind === 'admin' && f.value !== '').length,
    judgement: judgement.length,
    judgement_remaining: judgement.filter((f) => f.value === '').length,
  }
}

export function toDocumentSummary(
  stored: StoredDocument,
  info: SchoolViolenceInfo,
  materials: SchoolViolenceMaterial[],
): SchoolViolenceDocumentSummary {
  const { fields, ...summary } = stored
  const counts = stored.status === 'none' ? null : countFields(applyInfo(fields, info))
  // 시연 범위 밖 서류는 잠금 이유 대신 「시연 범위 밖」으로 보이므로 이유를 붙이지 않는다.
  const locked_reason = stored.available ? draftLockReason(stored.form_id, materials) : null
  return { ...summary, locked_reason, counts }
}

export function toDocument(
  stored: StoredDocument,
  info: SchoolViolenceInfo,
  materials: SchoolViolenceMaterial[],
): SchoolViolenceDocument {
  return {
    ...toDocumentSummary(stored, info, materials),
    fields: applyInfo(stored.fields, info),
  }
}
