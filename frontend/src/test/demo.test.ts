import { describe, expect, it } from 'vitest'
import type { CaseListResponse, DemoResetResponse } from '@/api/counselTypes.ts'
import { apiFetch } from '@/lib/api.ts'

describe('시연 초기화', () => {
  it('초기화하면 교사 목록에 시드 상담 건이 여러 상태로 남는다', async () => {
    const reset = await apiFetch<DemoResetResponse>('/api/demo/reset', { method: 'POST' })
    expect(reset).toEqual({ reset: true })

    const { cases } = await apiFetch<CaseListResponse>('/api/teacher/counsel/cases')

    // 시드는 개인상담 2~3건과, 학교폭력 사안 시나리오의 챗봇 상담 건(한지우) 하나다.
    const individual = cases.filter((c) => c.kind === 'individual')
    expect(individual.length).toBeGreaterThanOrEqual(2)
    expect(individual.length).toBeLessThanOrEqual(3)
    expect(cases.filter((c) => c.kind === 'chatbot').map((c) => c.student.name)).toEqual(['한지우'])
    expect(new Set(cases.map((c) => c.status)).size).toBeGreaterThan(1)
  })
})
