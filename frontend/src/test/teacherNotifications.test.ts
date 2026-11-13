import { describe, expect, it } from 'vitest'
import type {
  CaseListResponse,
  CaseResponse,
  CounselForm,
  CreateCaseResponse,
  JudgmentResponse,
} from '@/api/counselTypes.ts'
import { apiFetch } from '@/lib/api.ts'
import { takeNewHandoffs, unreadHandoffs } from '@/lib/counsel/notifications.ts'

const FORM: CounselForm = {
  topic: '교우관계',
  answers: [{ question: '어떤 고민이 있나요?', answer: '친구 관계가 신경 쓰여요.' }],
}

const listCases = async () => (await apiFetch<CaseListResponse>('/api/teacher/counsel/cases')).cases

async function createCase() {
  const { case: created } = await apiFetch<CreateCaseResponse>('/api/student/counsel/cases', {
    method: 'POST',
    body: { form: FORM },
  })
  return created.id
}

const studentPost = (id: string, action: 'handoff' | 'finish') =>
  apiFetch<JudgmentResponse>(`/api/student/counsel/cases/${id}/${action}`, { method: 'POST' })

describe('교사 알림 계산', () => {
  it('시드 건과 진행 중인 건은 알림이 아니다', async () => {
    await createCase()
    expect(unreadHandoffs(await listCases())).toEqual([])
  })

  it('전환된 건은 읽기 전까지 알림이고, 읽으면 사라진다', async () => {
    const id = await createCase()
    await studentPost(id, 'handoff')
    expect(unreadHandoffs(await listCases()).map((c) => c.id)).toEqual([id])

    await apiFetch<CaseResponse>(`/api/teacher/counsel/cases/${id}/read`, { method: 'POST' })
    expect(unreadHandoffs(await listCases())).toEqual([])
  })

  it('전환 없이 끝난 건은 목록에는 오르지만 알림이 아니다', async () => {
    const id = await createCase()
    await studentPost(id, 'finish')
    const cases = await listCases()
    expect(cases.some((c) => c.id === id)).toBe(true)
    expect(unreadHandoffs(cases)).toEqual([])
  })

  it('최신 전환 건이 알림 맨 앞에 온다', async () => {
    const first = await createCase()
    await studentPost(first, 'handoff')
    await new Promise((resolve) => setTimeout(resolve, 5))
    const second = await createCase()
    await studentPost(second, 'handoff')
    expect(unreadHandoffs(await listCases()).map((c) => c.id)).toEqual([second, first])
  })
})

describe('새 전환 건 감지(토스트)', () => {
  it('처음 불러온 목록에 이미 있는 알림은 토스트 대상이 아니다', async () => {
    const id = await createCase()
    await studentPost(id, 'handoff')
    const { fresh } = takeNewHandoffs(null, await listCases())
    expect(fresh).toEqual([])
  })

  it('폴링 사이에 새로 전환된 건은 한 번만 토스트 대상이 된다', async () => {
    const { seen } = takeNewHandoffs(null, await listCases())

    const id = await createCase()
    const beforeHandoff = takeNewHandoffs(seen, await listCases())
    expect(beforeHandoff.fresh).toEqual([])

    await studentPost(id, 'handoff')
    const afterHandoff = takeNewHandoffs(beforeHandoff.seen, await listCases())
    expect(afterHandoff.fresh.map((c) => c.id)).toEqual([id])

    const again = takeNewHandoffs(afterHandoff.seen, await listCases())
    expect(again.fresh).toEqual([])
  })

  it('종료 건은 토스트 대상이 아니다', async () => {
    const { seen } = takeNewHandoffs(null, await listCases())
    const id = await createCase()
    await studentPost(id, 'finish')
    expect(takeNewHandoffs(seen, await listCases()).fresh).toEqual([])
  })
})
