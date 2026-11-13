import { describe, expect, it } from 'vitest'
import type { CaseListResponse, DemoResetResponse } from '@/api/counselTypes.ts'
import { apiFetch } from '@/lib/api.ts'

describe('시연 초기화', () => {
  it('초기화하면 교사 목록에 시드 개인상담 건 2~3개가 여러 상태로 남는다', async () => {
    const reset = await apiFetch<DemoResetResponse>('/api/demo/reset', { method: 'POST' })
    expect(reset).toEqual({ reset: true })

    const { cases } = await apiFetch<CaseListResponse>('/api/teacher/counsel/cases')

    expect(cases.length).toBeGreaterThanOrEqual(2)
    expect(cases.length).toBeLessThanOrEqual(3)
    expect(cases.every((c) => c.kind === 'individual')).toBe(true)
    expect(new Set(cases.map((c) => c.status)).size).toBeGreaterThan(1)
  })
})
