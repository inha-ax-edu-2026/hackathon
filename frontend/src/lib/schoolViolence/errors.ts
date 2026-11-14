import { ApiError } from '@/lib/api.ts'

/** API 오류 본문의 `detail` 문장. 없으면 기본 안내. */
export function apiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const detail = (error.body as { detail?: unknown } | null)?.detail
    if (typeof detail === 'string') return detail
  }
  return '잠시 후 다시 시도해 주세요.'
}
