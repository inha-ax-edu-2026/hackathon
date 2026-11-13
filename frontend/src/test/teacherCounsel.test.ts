import { describe, expect, it } from 'vitest'
import type {
  CaseListResponse,
  CaseResponse,
  CounselForm,
  CreateCaseResponse,
  DocumentKind,
  DocumentsResponse,
  JudgmentResponse,
  SendMessageResponse,
  TeacherCaseDetailResponse,
} from '@/api/counselTypes.ts'
import { ApiError, apiFetch } from '@/lib/api.ts'

const FORM: CounselForm = {
  topic: '교우관계',
  answers: [
    { question: '지금 기분은 어때요? (1~5)', answer: '2' },
    { question: '어떤 고민이 있나요?', answer: '친구 관계가 신경 쓰여요.' },
  ],
}

const KINDS: DocumentKind[] = ['counsel_log', 'student_record', 'parent_notice', 'crisis_report']

const T = '/api/teacher/counsel/cases'

function createCase() {
  return apiFetch<CreateCaseResponse>('/api/student/counsel/cases', {
    method: 'POST',
    body: { form: FORM },
  })
}

let requestSeq = 0
function say(id: string, text: string) {
  requestSeq += 1
  return apiFetch<SendMessageResponse>(`/api/student/counsel/cases/${id}/messages`, {
    method: 'POST',
    body: { text, request_id: `r_teacher_${requestSeq}` },
  })
}

const studentPost = (id: string, action: 'handoff' | 'finish') =>
  apiFetch<JudgmentResponse>(`/api/student/counsel/cases/${id}/${action}`, { method: 'POST' })

/** 위험도별로 전환·종료된 상담 건을 만든다. */
async function handedOff(risk: 'high' | 'medium') {
  const { case: created } = await createCase()
  if (risk === 'high') await say(created.id, '그냥 다 그만두고 죽고 싶어')
  else await studentPost(created.id, 'handoff')
  return created.id
}

async function finished() {
  const { case: created } = await createCase()
  await say(created.id, '이야기하니까 좀 나아졌어')
  await studentPost(created.id, 'finish')
  return created.id
}

const detail = (id: string) => apiFetch<TeacherCaseDetailResponse>(`${T}/${id}`)
const teacherCases = () => apiFetch<CaseListResponse>(T)
const read = (id: string) => apiFetch<CaseResponse>(`${T}/${id}/read`, { method: 'POST' })
const approve = (id: string) => apiFetch<CaseResponse>(`${T}/${id}/approve`, { method: 'POST' })

const patchDoc = (id: string, kind: DocumentKind, body: { selected?: boolean; draft?: string }) =>
  apiFetch<DocumentsResponse>(`${T}/${id}/documents/${kind}`, { method: 'PATCH', body })

const approveDoc = (id: string, kind: DocumentKind) =>
  apiFetch<DocumentsResponse>(`${T}/${id}/documents/${kind}/approve`, { method: 'POST' })

async function documentsOf(id: string) {
  const documents = (await detail(id)).documents
  if (!documents) throw new Error('서류가 없다')
  return documents
}

async function statusOf(promise: Promise<unknown>) {
  try {
    await promise
    return 200
  } catch (error) {
    if (error instanceof ApiError) return error.status
    throw error
  }
}

describe('교사 목록', () => {
  it('진행 중 건은 없고 시드 건은 있다', async () => {
    const { case: created } = await createCase()

    const { cases } = await teacherCases()

    expect(cases.some((c) => c.id === created.id)).toBe(false)
    expect(cases.every((c) => c.status !== 'in_progress')).toBe(true)
    expect(cases.filter((c) => c.kind === 'individual').length).toBeGreaterThanOrEqual(2)
  })

  it('전환·종료 건과 시드 건이 최신순으로 나온다', async () => {
    const first = await handedOff('medium')
    const second = await finished()
    const third = await handedOff('high')

    const { cases } = await teacherCases()

    expect(cases.slice(0, 3).map((c) => c.id)).toEqual([third, second, first])
    const times = cases.map((c) => Date.parse(c.updated_at))
    expect(times).toEqual([...times].sort((a, b) => b - a))
  })

  it('알림 대상(전환됐고 읽지 않음)은 전환 건뿐이다: 시드·종료 건은 handoff가 없다', async () => {
    const handed = await handedOff('medium')
    const done = await finished()

    const { cases } = await teacherCases()
    const unread = cases.filter((c) => c.handoff !== null && !c.read).map((c) => c.id)

    expect(unread).toEqual([handed])
    expect(cases.find((c) => c.id === done)?.handoff).toBeNull()
    expect(cases.filter((c) => c.kind === 'individual').every((c) => c.handoff === null)).toBe(true)
  })
})

describe('교사 상세', () => {
  it('요약·양식이 오고 대화 전문(messages)은 어디에도 없다', async () => {
    const id = await handedOff('high')

    const res = await detail(id)

    expect(res.case.id).toBe(id)
    expect(res.summary).toBeTruthy()
    expect(res.form).toEqual(FORM)
    expect(Object.keys(res)).not.toContain('messages')
  })

  it('전환 요약과 서류 초안에 학생이 보낸 말이 그대로 들어가지 않는다', async () => {
    const utterances = [
      '반 애들이 나만 빼고 단톡방을 새로 만들었어',
      '점심시간마다 혼자 앉아 있어서 힘들어',
      '요즘은 그냥 다 그만두고 죽고 싶어',
    ]
    const { case: created } = await createCase()
    for (const text of utterances) await say(created.id, text)

    const res = await detail(created.id)

    expect(res.case.status).toBe('awaiting_approval')
    const texts = [res.summary ?? '', ...(res.documents?.items ?? []).map((d) => d.draft)]
    expect(texts).toHaveLength(5)
    for (const text of texts) {
      for (const utterance of utterances) expect(text).not.toContain(utterance)
    }
  })

  it('학생 요청 전환에서도 요약에 학생이 보낸 말이 그대로 들어가지 않는다', async () => {
    const utterance = '어제 체육 시간에 있었던 일이 계속 생각나'
    const { case: created } = await createCase()
    await say(created.id, utterance)
    await studentPost(created.id, 'handoff')

    const res = await detail(created.id)

    expect(res.summary).toBeTruthy()
    expect(res.summary).not.toContain(utterance)
    for (const d of res.documents?.items ?? []) expect(d.draft).not.toContain(utterance)
  })

  it('종료 건에도 대화 전문은 없고 서류도 없다', async () => {
    const id = await finished()

    const res = await detail(id)

    expect(res.case.status).toBe('completed')
    expect(res.summary).toBeTruthy()
    expect(res.form).toEqual(FORM)
    expect(res.documents).toBeNull()
    expect(Object.keys(res)).not.toContain('messages')
  })

  it('개인상담 시드 건은 요약·양식·서류가 없다', async () => {
    const res = await detail('seed_1')

    expect(res.case.kind).toBe('individual')
    expect(res.summary).toBeNull()
    expect(res.form).toBeNull()
    expect(res.documents).toBeNull()
  })

  it('없는 건과 진행 중인 건은 404', async () => {
    const { case: created } = await createCase()

    expect(await statusOf(detail('c_none'))).toBe(404)
    expect(await statusOf(detail(created.id))).toBe(404)
  })
})

describe('읽음 처리', () => {
  it('처리하기 전에는 read: false, 처리한 뒤에는 true로 유지된다', async () => {
    const id = await handedOff('high')
    expect((await detail(id)).case.read).toBe(false)

    const res = await read(id)

    expect(res.case.read).toBe(true)
    expect((await detail(id)).case.read).toBe(true)
    const listed = (await teacherCases()).cases.find((c) => c.id === id)
    expect(listed?.read).toBe(true)
  })

  it('없는 건은 404', async () => {
    expect(await statusOf(read('c_none'))).toBe(404)
  })
})

describe('상담 승인', () => {
  it('승인대기 건은 상담대기가 된다', async () => {
    const id = await handedOff('medium')

    const res = await approve(id)

    expect(res.case.status).toBe('awaiting_counsel')
    expect((await detail(id)).case.status).toBe('awaiting_counsel')
    expect((await teacherCases()).cases.find((c) => c.id === id)?.status).toBe('awaiting_counsel')
  })

  it('이미 승인한 건·종료 건·개인상담 시드는 409', async () => {
    const approved = await handedOff('medium')
    await approve(approved)

    expect(await statusOf(approve(approved))).toBe(409)
    expect(await statusOf(approve(await finished()))).toBe(409)
    expect(await statusOf(approve('seed_2'))).toBe(409)
  })

  it('없는 건은 404', async () => {
    expect(await statusOf(approve('c_none'))).toBe(404)
  })
})

describe('사후 서류 초안', () => {
  it('전환된 건에 서류 4종이 정해진 순서로 있다', async () => {
    const documents = await documentsOf(await handedOff('high'))

    expect(documents.items.map((d) => d.kind)).toEqual(KINDS)
    for (const d of documents.items) {
      expect(d.title).toBeTruthy()
      expect(d.audience).toBeTruthy()
      expect(d.draft.length).toBeGreaterThan(0)
      expect(d.recommend_reason).toBeTruthy()
      expect(d.approved).toBe(false)
    }
    expect(documents.items.map((d) => [d.title, d.audience])).toEqual([
      ['상담일지', '교사 보관용'],
      ['학생부 상담 기록 초안', '학교생활기록부 누가기록'],
      ['학부모 안내문', '보호자'],
      ['위기 학생 관리 보고서', '학교 관리자·상담교사'],
    ])
  })

  it('위험도 높음이면 4종 모두 추천되고 처음부터 선택되어 있다', async () => {
    const { items } = await documentsOf(await handedOff('high'))

    expect(items.map((d) => d.recommended)).toEqual([true, true, true, true])
    expect(items.map((d) => d.selected)).toEqual([true, true, true, true])
  })

  it('위험도 보통이면 위기 학생 관리 보고서만 추천하지 않는다', async () => {
    const { items } = await documentsOf(await handedOff('medium'))

    expect(items.map((d) => d.recommended)).toEqual([true, true, true, false])
    expect(items.map((d) => d.selected)).toEqual([true, true, true, false])
  })

  it('추천 근거에 위험도가 드러난다', async () => {
    const high = (await documentsOf(await handedOff('high'))).items
    const medium = (await documentsOf(await handedOff('medium'))).items

    expect(high[3].recommend_reason).toContain('높음')
    expect(medium[2].recommend_reason).toContain('보통')
    expect(medium[3].recommend_reason).toContain('높음일 때만')
  })

  it('종료 건에는 서류가 없다', async () => {
    expect((await detail(await finished())).documents).toBeNull()
  })

  it('서류 본문에 「비대면 상담」이 없고 「개인상담으로 전환」을 쓴다', async () => {
    for (const risk of ['high', 'medium'] as const) {
      const { items } = await documentsOf(await handedOff(risk))
      const all = items.map((d) => d.draft).join('\n')

      expect(all).not.toContain('비대면 상담')
      expect(all).toContain('개인상담으로 전환')
    }
  })

  it('초안에 양식 주제와 감지 키워드가 쓰인다', async () => {
    const { items } = await documentsOf(await handedOff('high'))

    expect(items[0].draft).toContain('교우관계')
    expect(items[0].draft).toContain('죽고 싶')
    expect(items[3].draft).toContain('죽고 싶')
  })
})

describe('서류 선택·수정·승인', () => {
  it('선택을 바꾸면 저장되어 다시 불러도 유지된다', async () => {
    const id = await handedOff('medium')

    const res = await patchDoc(id, 'parent_notice', { selected: false })
    expect(res.documents.items[2].selected).toBe(false)
    await patchDoc(id, 'crisis_report', { selected: true })

    const { items } = await documentsOf(id)
    expect(items.map((d) => d.selected)).toEqual([true, true, false, true])
    expect(items.map((d) => d.recommended)).toEqual([true, true, true, false])
  })

  it('초안 본문을 고치면 저장되어 다시 불러도 유지된다', async () => {
    const id = await handedOff('high')

    await patchDoc(id, 'counsel_log', { draft: '직접 고친 상담일지' })

    const { items } = await documentsOf(id)
    expect(items[0].draft).toBe('직접 고친 상담일지')
    expect(items[1].draft).not.toBe('직접 고친 상담일지')
  })

  it('승인하면 저장되고, 선택한 서류가 모두 승인되면 승인 완료', async () => {
    const id = await handedOff('medium')
    await approveDoc(id, 'counsel_log')
    await approveDoc(id, 'student_record')

    const partial = await documentsOf(id)
    expect(partial.items.map((d) => d.approved)).toEqual([true, true, false, false])
    expect(partial.all_approved).toBe(false)

    const done = await approveDoc(id, 'parent_notice')
    expect(done.documents.all_approved).toBe(true)
    expect((await documentsOf(id)).all_approved).toBe(true)
  })

  it('선택을 빼면 남은 선택 서류만 승인해도 승인 완료가 된다', async () => {
    const id = await handedOff('medium')
    await patchDoc(id, 'parent_notice', { selected: false })
    await approveDoc(id, 'counsel_log')
    await approveDoc(id, 'student_record')

    expect((await documentsOf(id)).all_approved).toBe(true)
  })

  it('선택한 서류가 하나도 없으면 승인 완료가 아니다', async () => {
    const id = await handedOff('medium')
    for (const kind of KINDS) await patchDoc(id, kind, { selected: false })

    const documents = await documentsOf(id)
    expect(documents.saved_minutes).toBe(0)
    expect(documents.all_approved).toBe(false)
  })

  it('승인한 서류의 본문을 고치면 승인이 풀린다', async () => {
    const id = await handedOff('high')
    await approveDoc(id, 'counsel_log')

    await patchDoc(id, 'counsel_log', { draft: '고친 본문' })

    expect((await documentsOf(id)).items[0].approved).toBe(false)
  })

  it('선택하지 않은 서류는 승인할 수 없다(409)', async () => {
    const id = await handedOff('medium')

    expect(await statusOf(approveDoc(id, 'crisis_report'))).toBe(409)
  })

  it('잘못된 요청은 거절된다', async () => {
    const id = await handedOff('high')

    expect(await statusOf(patchDoc(id, 'counsel_log', {}))).toBe(422)
    expect(await statusOf(patchDoc(id, 'counsel_log', { draft: '   ' }))).toBe(422)
    expect(await statusOf(patchDoc(id, 'unknown' as DocumentKind, { selected: true }))).toBe(404)
    expect(await statusOf(approveDoc(id, 'unknown' as DocumentKind))).toBe(404)
    expect(await statusOf(patchDoc('c_none', 'counsel_log', { selected: true }))).toBe(404)
  })

  it('서류가 없는 종료 건·시드 건은 404', async () => {
    expect(await statusOf(patchDoc(await finished(), 'counsel_log', { selected: false }))).toBe(404)
    expect(await statusOf(approveDoc('seed_1', 'counsel_log'))).toBe(404)
  })

  it('상담 승인 뒤에도 서류 동작이 저장된다', async () => {
    const id = await handedOff('high')
    await approve(id)

    await approveDoc(id, 'counsel_log')

    expect((await documentsOf(id)).items[0].approved).toBe(true)
  })
})

describe('절감 시간', () => {
  it('절감 분은 선택한 서류 수 × 7이다', async () => {
    const id = await handedOff('high')
    expect((await documentsOf(id)).saved_minutes).toBe(28)

    expect((await patchDoc(id, 'parent_notice', { selected: false })).documents.saved_minutes).toBe(
      21,
    )
    expect((await patchDoc(id, 'crisis_report', { selected: false })).documents.saved_minutes).toBe(
      14,
    )
    expect((await patchDoc(id, 'crisis_report', { selected: true })).documents.saved_minutes).toBe(
      21,
    )
  })

  it('승인 여부와 무관하다', async () => {
    const id = await handedOff('medium')
    const before = (await documentsOf(id)).saved_minutes

    const after = (await approveDoc(id, 'counsel_log')).documents

    expect(before).toBe(21)
    expect(after.saved_minutes).toBe(21)
  })

  it('근거 가정치(직접 작성 8분, 검토 1분)를 함께 준다', async () => {
    const documents = await documentsOf(await handedOff('medium'))

    expect(documents.manual_minutes_per_document).toBe(8)
    expect(documents.review_minutes_per_document).toBe(1)
  })
})
