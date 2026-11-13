import { HttpResponse, http } from 'msw'
import { demoHandlers } from '@/mocks/counsel/demoHandlers.ts'
import { studentHandlers } from '@/mocks/counsel/studentHandlers.ts'
import { teacherHandlers } from '@/mocks/counsel/teacherHandlers.ts'
import { apiUrl } from '@/mocks/http.ts'

/**
 * 목 API 응답 정의. 응답 형식은 backend 스펙을 그대로 따른다.
 * 여기에 없는 요청은 실제 백엔드로 그대로 전달된다(onUnhandledFrame: 'bypass').
 * 상담 API는 영역별 파일(src/mocks/counsel/*Handlers.ts)에 두고 여기서 모은다.
 */
export const handlers = [
  http.get(apiUrl('/api/health'), () => HttpResponse.json({ status: 'ok', mock: true })),
  ...demoHandlers,
  ...studentHandlers,
  ...teacherHandlers,
]
