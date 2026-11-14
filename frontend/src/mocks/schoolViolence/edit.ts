import type { SaveDocumentFieldEdit } from '@/api/schoolViolenceTypes.ts'
import { isAiField } from '@/lib/schoolViolence/aiField.ts'
import type { StoredDocument } from './store.ts'

/**
 * 서류 칸 저장·승인 규칙. 처리 방식(kind)만 보므로 서류 양식이 달라도(1-3, 2-4, …) 그대로 쓴다.
 * - AI 칸: 값이 있거나 교사가 비운 narrative 칸(`isAiField`). 검토 표시를 할 수 있고, 값을 고치면 검토가 풀리고 교사 수정 표시가 붙는다.
 * - 판단 칸: manual·sensitive. 교사가 값을 입력한다. 검토 대상이 아니라 교사 수정 표시도 붙지 않는다.
 * - 사안 정보 칸: admin. 서류에서는 고치지 않는다.
 */

export const MAX_FIELD_LENGTH = 6000

export type EditFailure = { status: 422; detail: string }

const fail = (detail: string): EditFailure => ({ status: 422, detail })

export const unreviewedAiFields = (doc: Pick<StoredDocument, 'fields'>) =>
  doc.fields.filter((field) => isAiField(field) && !field.reviewed)

/** 수정 목록을 검증한다. 하나라도 잘못이면 아무것도 적용하지 않도록 적용 전에 부른다. */
export function validateEdits(doc: StoredDocument, edits: unknown): EditFailure | null {
  if (!Array.isArray(edits)) return fail('고칠 칸 목록을 보내 주세요.')
  for (const edit of edits as Partial<SaveDocumentFieldEdit>[]) {
    const field = doc.fields.find((f) => f.id === edit?.id)
    if (!field) return fail(`서류에 없는 칸이에요: ${String(edit?.id)}`)
    if (edit.value === undefined && edit.reviewed === undefined) {
      return fail('고칠 값이나 검토 표시를 보내 주세요.')
    }
    if (edit.value !== undefined) {
      if (typeof edit.value !== 'string') return fail('칸 값은 글자로 보내 주세요.')
      if (field.kind === 'admin') {
        return fail('사안 정보 칸은 서류에서 고칠 수 없어요. 사안 정보에서 고쳐 주세요.')
      }
      if (edit.value.length > MAX_FIELD_LENGTH) {
        return fail(`칸 값은 ${MAX_FIELD_LENGTH}자까지 쓸 수 있어요.`)
      }
    }
    if (edit.reviewed !== undefined) {
      if (typeof edit.reviewed !== 'boolean') return fail('검토 표시를 다시 확인해 주세요.')
      if (!isAiField(field)) return fail('AI가 쓴 칸에만 검토 표시를 할 수 있어요.')
    }
  }
  return null
}

/**
 * 검증을 통과한 수정을 적용하고 개정 번호를 올린다.
 * 승인한 서류는 검토하지 않은 AI 칸이 생기면 검토 중으로 돌아간다.
 */
export function applyEdits(doc: StoredDocument, edits: SaveDocumentFieldEdit[]) {
  for (const edit of edits) {
    const field = doc.fields.find((f) => f.id === edit.id)
    if (!field) continue
    const changed = edit.value !== undefined && edit.value !== field.value
    if (changed) {
      field.value = edit.value ?? ''
      // 판단 칸은 처음부터 사람이 쓰는 칸이라 「교사 수정」 표시를 붙이지 않는다.
      if (field.kind === 'narrative') {
        field.edited = true
        field.reviewed = false
      }
    } else if (edit.reviewed !== undefined) {
      field.reviewed = edit.reviewed
    }
  }
  doc.revision += 1
  if (doc.status === 'approved' && unreviewedAiFields(doc).length > 0) doc.status = 'reviewing'
}
