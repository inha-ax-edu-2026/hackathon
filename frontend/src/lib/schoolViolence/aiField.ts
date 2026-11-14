import type { DocumentField } from '@/api/schoolViolenceTypes.ts'

/**
 * 검토 대상인 AI 칸. 값이 있는 narrative 칸이고, 교사가 비워도(edited) 계속 AI 칸이다.
 * 비운 칸도 검토 표시를 해야 승인되고, 집계의 「AI 작성 n칸」에서도 빠지지 않는다.
 * 서버(목 포함)와 화면이 같은 규칙을 쓰도록 한 곳에 둔다.
 */
export const isAiField = (field: DocumentField) =>
  field.kind === 'narrative' && (field.value !== '' || field.edited)
