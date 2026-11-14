import { HttpResponse, http } from 'msw'
import type { DemoResetResponse } from '@/api/counselTypes.ts'
import { apiUrl } from '@/mocks/http.ts'
import { resetParentMock } from '@/mocks/parent/handlers.ts'
import { resetDb } from './db.ts'

/** 시연 런처의 「시연 초기화」. 제안서 6.10 */
export const demoHandlers = [
  http.post(apiUrl('/api/demo/reset'), () => {
    resetDb()
    resetParentMock()
    return HttpResponse.json<DemoResetResponse>({ reset: true })
  }),
]
