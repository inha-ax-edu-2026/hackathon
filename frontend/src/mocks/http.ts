import { HttpResponse } from 'msw'
import type { ApiErrorBody } from '@/api/counselTypes.ts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/** 목 핸들러 경로. apiFetch와 같은 기본 주소를 붙여 브라우저·테스트 모두에서 맞물리게 한다. */
export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`
}

/** backend 오류 형식 `{ detail }` 그대로의 목 오류 응답. */
export function errorJson(status: number, detail: string) {
  return HttpResponse.json<ApiErrorBody>({ detail }, { status })
}
