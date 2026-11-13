import { HttpResponse, http } from 'msw'
import type { CaseListResponse } from '@/api/counselTypes.ts'
import { apiUrl } from '@/mocks/http.ts'
import { loadDb } from './db.ts'

/** 교사 상담 API 목(`/api/teacher/counsel/...`). 제안서 6.6~6.9 */
export const teacherHandlers = [
  // 6.6 개인상담 관리 목록: 진행 중 건은 빼고 최신순(updated_at 내림차순)
  http.get(apiUrl('/api/teacher/counsel/cases'), () => {
    const cases = loadDb()
      .cases.map((stored) => stored.case)
      .filter((c) => c.status !== 'in_progress')
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    return HttpResponse.json<CaseListResponse>({ cases })
  }),
]
