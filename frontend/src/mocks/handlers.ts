import { HttpResponse, http } from 'msw'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * 목 API 응답 정의. 응답 형식은 backend 스펙을 그대로 따른다.
 * 여기에 없는 요청은 실제 백엔드로 그대로 전달된다(onUnhandledFrame: 'bypass').
 */
export const handlers = [
  http.get(`${API_BASE_URL}/api/health`, () => HttpResponse.json({ status: 'ok', mock: true })),
]
