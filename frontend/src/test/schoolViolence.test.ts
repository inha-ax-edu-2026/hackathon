import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import type { CaseListResponse, TeacherCaseDetailResponse } from '@/api/counselTypes.ts'
import { generateSchoolViolenceDraft, openSchoolViolenceWorkspace } from '@/api/schoolViolence.ts'
import type {
  DocumentField,
  DocumentGenerationJob,
  IntakeSchoolViolenceCaseRequest,
  SchoolViolenceCaseListResponse,
  SchoolViolenceCaseResponse,
  SchoolViolenceDocumentResponse,
} from '@/api/schoolViolenceTypes.ts'
import { ApiError, apiFetch } from '@/lib/api.ts'
import { isAiField } from '@/lib/schoolViolence/aiField.ts'
import { offenderFieldId } from '@/lib/schoolViolence/studentFields.ts'
import { apiUrl } from '@/mocks/http.ts'
import { server } from '@/mocks/node.ts'

/** 학교폭력 사안 API 계약(제안, ADR 0002). 접수와 사안 페이지 뼈대(티켓 01)만 다룬다. */

const COUNSEL = '/api/teacher/counsel/cases'
const SV = '/api/teacher/school-violence/cases'

async function statusOf(promise: Promise<unknown>) {
  try {
    await promise
    return 200
  } catch (error) {
    if (error instanceof ApiError) return error.status
    throw error
  }
}

/** 시드의 피해 관련 학생(한지우) AI 챗봇 상담 건 id */
async function victimCounselId() {
  const { cases } = await apiFetch<CaseListResponse>(COUNSEL)
  const found = cases.find((c) => c.kind === 'chatbot' && c.student.name === '한지우')
  if (!found) throw new Error('시드에 한지우 챗봇 상담 건이 없다')
  return found.id
}

const intake = (counselCaseId: string, extra: Partial<IntakeSchoolViolenceCaseRequest> = {}) =>
  apiFetch<SchoolViolenceCaseResponse>(SV, {
    method: 'POST',
    body: { counsel_case_id: counselCaseId, ...extra },
  })

const counselDetail = (id: string) => apiFetch<TeacherCaseDetailResponse>(`${COUNSEL}/${id}`)

describe('중단되지 않는 AI 서류 생성', () => {
  const job = (caseId: string): DocumentGenerationJob => ({
    id: 'slow-job',
    case_id: caseId,
    form_id: '2-4',
    status: 'running',
    created_at: '2026-11-14T04:00:00Z',
    updated_at: '2026-11-14T04:00:00Z',
    error: null,
  })

  it('접수된 작업을 조회해 완성된 서류를 받고 생성 요청은 한 번만 보낸다', async () => {
    const { case: created } = await intake(await victimCounselId())
    const path = `${SV}/${created.id}/documents/2-4`
    const expected = await apiFetch<SchoolViolenceDocumentResponse>(`${path}/draft`, {
      method: 'POST',
      body: {},
    })
    let posts = 0
    let polls = 0
    server.use(
      http.post(apiUrl(`${path}/draft`), async ({ request }) => {
        posts += 1
        expect(await request.json()).toMatchObject({
          async_generation: true,
          external_consent: true,
        })
        return HttpResponse.json({ job: job(created.id) }, { status: 202 })
      }),
      http.get(apiUrl(`${path}/jobs/slow-job`), () => {
        polls += 1
        return HttpResponse.json(
          polls === 1
            ? { job: job(created.id) }
            : {
                job: { ...job(created.id), status: 'completed' },
                document: expected.document,
              },
        )
      }),
    )
    const result = await generateSchoolViolenceDraft(created.id, '2-4', { external_consent: true })
    expect(result.document).toEqual(expected.document)
    expect(posts).toBe(1)
    expect(polls).toBe(2)
  })

  it('모델 작업의 실패 사유를 일반 연결 오류 대신 전달한다', async () => {
    const { case: created } = await intake(await victimCounselId())
    const path = `${SV}/${created.id}/documents/2-4`
    server.use(
      http.post(apiUrl(`${path}/draft`), () =>
        HttpResponse.json({ job: job(created.id) }, { status: 202 }),
      ),
      http.get(apiUrl(`${path}/jobs/slow-job`), () =>
        HttpResponse.json({
          job: {
            ...job(created.id),
            status: 'failed',
            error: { status: 504, detail: '고성능 모델 응답 대기 시간 초과' },
          },
        }),
      ),
    )
    await expect(
      generateSchoolViolenceDraft(created.id, '2-4', { external_consent: true }),
    ).rejects.toMatchObject({
      status: 504,
      message: '고성능 모델 응답 대기 시간 초과',
    })
  })

  it('즉시 완성된 응답도 같은 API로 처리한다', async () => {
    const { case: created } = await intake(await victimCounselId())
    const result = await generateSchoolViolenceDraft(created.id, '2-4')
    expect(result.document.status).toBe('reviewing')
    expect(result.document.fields.length).toBeGreaterThan(0)
  })

  it('이전 서버에는 새 API 적용을 위한 재시작을 안내한다', async () => {
    server.use(
      http.post(apiUrl(`${SV}/old/documents/2-4/draft`), () =>
        HttpResponse.json(
          {
            detail: [{ loc: ['body', 'async_generation'], type: 'extra_forbidden' }],
          },
          { status: 422 },
        ),
      ),
    )
    await expect(generateSchoolViolenceDraft('old', '2-4')).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining('재시작'),
    })
  })
})

describe('사안 접수', () => {
  it('접수하기 전에는 사안이 없고, 한지우 상담 건은 사안과 연결되어 있지 않다', async () => {
    const list = await apiFetch<SchoolViolenceCaseListResponse>(SV)
    expect(list.cases).toEqual([])

    const detail = await counselDetail(await victimCounselId())
    expect(detail.documents).not.toBeNull()
    expect(detail.school_violence_case_id).toBeNull()
  })

  it('접수하면 사안 정보·사안 자료·서류 9종이 채워진 사안이 생긴다', async () => {
    const before = Date.now()
    const { case: created } = await intake(await victimCounselId())

    expect(created.info.school_name).toBe('가온중학교')
    expect(created.info.case_number).not.toBe('')
    expect(created.info.teacher_name).toBe('이수진')
    expect(Date.parse(created.info.received_at)).toBeGreaterThanOrEqual(before - 1000)
    expect(created.info.students.map((s) => [s.name, s.role])).toEqual([
      ['한지우', 'victim'],
      ['정민혁', 'offender'],
      ['박도윤', 'offender'],
      ['최서진', 'offender'],
    ])
    expect(created.stage).toBe('intake')

    expect([...new Set(created.materials.map((m) => m.kind))].sort()).toEqual([
      'counsel_record',
      'interview_transcript',
      'statement',
      'student_record',
    ])
    // 조사 단계 자료는 시연용으로 미리 넣었다는 표시가 있다.
    const investigation = created.materials.filter((m) => m.stage === 'investigation')
    expect(investigation.length).toBeGreaterThan(0)
    expect(investigation.every((m) => m.demo_preloaded)).toBe(true)
    expect(created.materials.every((m) => m.body.length > 0)).toBe(true)

    expect(created.documents.map((d) => `${d.stage}:${d.form_id}`)).toEqual([
      'intake:1-1',
      'intake:1-2',
      'intake:1-3',
      'investigation:2-1',
      'investigation:2-2',
      'investigation:2-3',
      'investigation:2-4',
      'investigation:2-7',
      'review:3-1',
    ])
    expect(created.documents.every((d) => d.status === 'none')).toBe(true)
    expect(created.documents.every((d) => d.author !== '' && d.approval !== '')).toBe(true)
    // 이번 시연에서 작업할 수 있는 서류는 1-3과 2-4뿐이다.
    expect(created.documents.filter((d) => d.available).map((d) => d.form_id)).toEqual([
      '1-3',
      '2-4',
    ])

    // 목록과 상세 조회에서도 같은 사안이 보인다.
    const list = await apiFetch<SchoolViolenceCaseListResponse>(SV)
    expect(list.cases.map((c) => c.id)).toEqual([created.id])
    const fetched = await apiFetch<SchoolViolenceCaseResponse>(`${SV}/${created.id}`)
    expect(fetched.case).toEqual(created)
  })
})

describe('중복 접수와 상담 건 연결', () => {
  it('서류 작업실을 다시 열면 기존 사안을 재사용하고 상담 연결을 유지한다', async () => {
    const counselId = await victimCounselId()
    const first = await openSchoolViolenceWorkspace(counselId)
    const reopened = await openSchoolViolenceWorkspace(counselId)

    expect(reopened.case.id).toBe(first.case.id)
    expect(reopened.case.counsel_case_ids).toEqual([counselId])
    expect((await counselDetail(counselId)).school_violence_case_id).toBe(first.case.id)
    expect((await apiFetch<SchoolViolenceCaseListResponse>(SV)).cases).toHaveLength(1)
  })

  it('같은 상담 건을 다시 접수하면 거절되고 사안은 늘지 않는다', async () => {
    const counselId = await victimCounselId()
    await intake(counselId)

    expect(await statusOf(intake(counselId))).toBe(409)

    const list = await apiFetch<SchoolViolenceCaseListResponse>(SV)
    expect(list.cases).toHaveLength(1)
  })

  it('접수한 뒤 상담 상세를 다시 조회하면 연결된 사안 ID가 실린다', async () => {
    const counselId = await victimCounselId()
    const { case: created } = await intake(counselId)

    const detail = await counselDetail(counselId)

    expect(detail.school_violence_case_id).toBe(created.id)
    expect(created.counsel_case_ids).toEqual([counselId])
  })

  it('없는 상담 건이나 잘못된 요청은 거절된다', async () => {
    expect(await statusOf(intake('c_none'))).toBe(404)
    expect(await statusOf(apiFetch(SV, { method: 'POST', body: {} }))).toBe(422)
    expect(await statusOf(apiFetch(`${SV}/sv_none`))).toBe(404)
  })
})

describe('시연 초기화', () => {
  it('초기화하면 접수한 사안이 사라지고 상담 건은 다시 접수할 수 있다', async () => {
    const counselId = await victimCounselId()
    const { case: created } = await intake(counselId)

    await apiFetch('/api/demo/reset', { method: 'POST' })

    const list = await apiFetch<SchoolViolenceCaseListResponse>(SV)
    expect(list.cases).toEqual([])
    expect(await statusOf(apiFetch(`${SV}/${created.id}`))).toBe(404)
    expect((await counselDetail(counselId)).school_violence_case_id).toBeNull()
    expect(await statusOf(intake(counselId))).toBe(200)
  })
})

describe('1-3 초안 생성과 서류 상세', () => {
  const docPath = (caseId: string, formId: string) => `${SV}/${caseId}/documents/${formId}`
  const generate = (caseId: string, formId: string, body: object = {}) =>
    apiFetch<SchoolViolenceDocumentResponse>(`${docPath(caseId, formId)}/draft`, {
      method: 'POST',
      body,
    })

  async function intakeCase() {
    return (await intake(await victimCounselId())).case
  }

  it('초안을 만들기 전에는 칸이 없고 상태가 초안 없음이다', async () => {
    const created = await intakeCase()

    const { document } = await apiFetch<SchoolViolenceDocumentResponse>(docPath(created.id, '1-3'))

    expect(document.form_id).toBe('1-3')
    expect(document.status).toBe('none')
    expect(document.fields).toEqual([])
    expect(document.counts).toBeNull()
  })

  it('초안을 만들면 칸이 채워지고 서류 상태가 검토 중으로 바뀐다', async () => {
    const created = await intakeCase()

    const { document } = await generate(created.id, '1-3')

    expect(document.status).toBe('reviewing')
    expect(document.fields.length).toBeGreaterThan(0)
    // 다시 조회해도, 사안 상세의 서류 목록에서도 검토 중이다.
    const fetched = await apiFetch<SchoolViolenceDocumentResponse>(docPath(created.id, '1-3'))
    expect(fetched.document).toEqual(document)
    const detail = await apiFetch<SchoolViolenceCaseResponse>(`${SV}/${created.id}`)
    expect(detail.case.documents.find((d) => d.form_id === '1-3')?.status).toBe('reviewing')
    expect(detail.case.documents.find((d) => d.form_id === '2-4')?.status).toBe('none')
  })

  it('AI 칸에는 근거 인용이 있고 인용문은 해당 사안 자료 원문에 들어 있다', async () => {
    const created = await intakeCase()
    const { document } = await generate(created.id, '1-3')

    const aiFields = document.fields.filter((f) => f.kind === 'narrative')
    expect(aiFields.length).toBeGreaterThan(0)
    for (const field of aiFields) {
      expect(field.value).not.toBe('')
      expect(field.evidence.length).toBeGreaterThan(0)
      for (const { source_id, quote } of field.evidence) {
        const material = created.materials.find((m) => m.id === source_id)
        expect(material, `${field.id}의 출처 ${source_id}`).toBeDefined()
        expect(material?.body).toContain(quote)
      }
    }
  })

  it('판단 칸은 비어 있고 인용도 없다', async () => {
    const created = await intakeCase()
    const { document } = await generate(created.id, '1-3')

    const judgement = document.fields.filter((f) => f.kind === 'manual' || f.kind === 'sensitive')
    expect(judgement.length).toBeGreaterThan(0)
    expect(judgement.every((f) => f.value === '' && f.evidence.length === 0)).toBe(true)
    // 조사관 배정 요청·분리 예외 사유 같은 판단은 AI가 대신 정하지 않는다.
    const ids = document.fields.map((f) => f.id)
    expect(ids).toEqual(expect.arrayContaining(['investigator', 'requests', 'availability.victim']))
  })

  it('사안 정보 칸은 사안 정보의 값을 가져온다', async () => {
    const created = await intakeCase()
    const { document } = await generate(created.id, '1-3')
    const byId = Object.fromEntries(document.fields.map((f) => [f.id, f]))

    expect(byId.school.kind).toBe('admin')
    expect(byId.school.value).toBe(created.info.school_name)
    expect(byId.case_number.value).toBe(created.info.case_number)
    expect(byId.teacher.value).toBe(created.info.teacher_name)
    expect(byId.students.kind).toBe('admin')
    for (const student of created.info.students) {
      expect(byId.students.value).toContain(student.name)
    }
    // 사안 정보 칸에는 인용이 없다.
    expect(byId.school.evidence).toEqual([])
  })

  it('집계는 AI 작성 칸·전체 칸·남은 판단 칸 수를 센다', async () => {
    const created = await intakeCase()
    const { document } = await generate(created.id, '1-3')

    const { counts } = document
    expect(counts).not.toBeNull()
    expect(counts?.total).toBe(document.fields.length)
    expect(counts?.ai).toBe(document.fields.filter((f) => f.kind === 'narrative').length)
    expect(counts?.judgement_remaining).toBe(
      document.fields.filter((f) => (f.kind === 'manual' || f.kind === 'sensitive') && !f.value)
        .length,
    )
    // 사안 상세의 서류 목록에도 같은 집계가 실린다.
    const detail = await apiFetch<SchoolViolenceCaseResponse>(`${SV}/${created.id}`)
    expect(detail.case.documents.find((d) => d.form_id === '1-3')?.counts).toEqual(counts)
  })

  it('잠긴 서류나 없는 서류·사안은 초안을 만들 수 없다', async () => {
    const created = await intakeCase()

    expect(await statusOf(generate(created.id, '1-1'))).toBe(409)
    expect(await statusOf(generate(created.id, '9-9'))).toBe(404)
    expect(await statusOf(generate('sv_none', '1-3'))).toBe(404)
    expect(await statusOf(apiFetch(docPath(created.id, '9-9')))).toBe(404)
  })
})

describe('사안 목록', () => {
  it('목록 응답에 사안번호·관련 학생·단계와 서류 진행률이 실린다', async () => {
    const { case: created } = await intake(await victimCounselId())

    const { cases } = await apiFetch<SchoolViolenceCaseListResponse>(SV)

    expect(cases).toHaveLength(1)
    const [item] = cases
    expect(item.id).toBe(created.id)
    expect(item.case_number).toBe(created.info.case_number)
    expect(item.students.map((s) => s.name)).toEqual(['한지우', '정민혁', '박도윤', '최서진'])
    // 아직 승인한 서류가 없으니 접수 단계이고, 작업 가능한 서류 2종 중 0종 승인이다.
    expect(item.stage).toBe('intake')
    expect(item.progress).toEqual({ approved: 0, total: 2 })
    // 상세와 같은 값을 준다.
    expect(item.stage).toBe(created.stage)
    expect(item.progress).toEqual(created.progress)
  })
})

describe('상담 상세의 학폭 권고', () => {
  it('학폭 키워드가 있는 시드 상담 건은 권고가 참이고 근거 키워드가 실린다', async () => {
    const detail = await counselDetail(await victimCounselId())

    expect(detail.school_violence_recommendation.recommended).toBe(true)
    expect(detail.school_violence_recommendation.keywords).toEqual(['학교폭력', '괴롭'])
  })

  it('학폭 키워드가 없는 건은 권고가 거짓이고 키워드가 비어 있다', async () => {
    const { cases } = await apiFetch<CaseListResponse>(COUNSEL)
    const plain = cases.filter((c) => c.kind === 'individual')
    expect(plain.length).toBeGreaterThan(0)

    for (const c of plain) {
      const { school_violence_recommendation: recommendation } = await counselDetail(c.id)
      expect(recommendation).toEqual({ recommended: false, keywords: [] })
    }
  })

  it('권고만으로는 사안이 생기지 않는다', async () => {
    await counselDetail(await victimCounselId())

    const list = await apiFetch<SchoolViolenceCaseListResponse>(SV)
    expect(list.cases).toEqual([])
  })

  it('접수한 뒤에도 권고 근거는 그대로 남고 사안 ID가 함께 실린다', async () => {
    const counselId = await victimCounselId()
    const { case: created } = await intake(counselId)

    const detail = await counselDetail(counselId)
    expect(detail.school_violence_case_id).toBe(created.id)
    expect(detail.school_violence_recommendation.recommended).toBe(true)
  })
})

describe('칸 편집·검토·승인', () => {
  const docPath = (caseId: string, formId: string) => `${SV}/${caseId}/documents/${formId}`
  const generate = (caseId: string, body: object = {}) =>
    apiFetch<SchoolViolenceDocumentResponse>(`${docPath(caseId, '1-3')}/draft`, {
      method: 'POST',
      body,
    })
  const save = (caseId: string, revision: number, fields: object[]) =>
    apiFetch<SchoolViolenceDocumentResponse>(`${docPath(caseId, '1-3')}/save`, {
      method: 'POST',
      body: { revision, fields },
    })
  const approve = (caseId: string, revision: number) =>
    apiFetch<SchoolViolenceDocumentResponse>(`${docPath(caseId, '1-3')}/approve`, {
      method: 'POST',
      body: { revision },
    })
  const current = (caseId: string) =>
    apiFetch<SchoolViolenceDocumentResponse>(docPath(caseId, '1-3')).then((r) => r.document)

  /** 접수 → 초안 생성까지 마친 사안과 서류. */
  async function drafted() {
    const created = (await intake(await victimCounselId())).case
    const { document } = await generate(created.id)
    return { caseId: created.id, document }
  }

  /** AI 칸을 모두 검토한 저장 본문. */
  const reviewAll = (fields: DocumentField[]) =>
    fields.filter(isAiField).map((f) => ({ id: f.id, reviewed: true }))

  it('AI 칸을 고치면 검토 표시가 풀리고 교사 수정 표시가 붙으며 개정 번호가 오른다', async () => {
    const { caseId, document } = await drafted()
    const target = document.fields.filter((f) => f.kind === 'narrative' && f.value !== '')[0]
    const reviewed = await save(caseId, document.revision, [{ id: target.id, reviewed: true }])
    expect(reviewed.document.fields.find((f) => f.id === target.id)?.reviewed).toBe(true)
    expect(reviewed.document.revision).toBe(document.revision + 1)

    const edited = await save(caseId, reviewed.document.revision, [
      { id: target.id, value: '교사가 고친 내용' },
    ])

    const after = edited.document.fields.find((f) => f.id === target.id)
    expect(after?.value).toBe('교사가 고친 내용')
    expect(after?.reviewed).toBe(false)
    expect(after?.edited).toBe(true)
    // 기존 인용은 남는다. 화면은 「교사 수정」 표시로 인용이 전부를 입증하지 않음을 알린다.
    expect(after?.evidence).toEqual(target.evidence)
    expect(edited.document.revision).toBe(reviewed.document.revision + 1)
    expect(await current(caseId)).toEqual(edited.document)
  })

  it('판단 칸은 교사가 직접 입력할 수 있고 남은 판단 칸 수가 줄어든다', async () => {
    const { caseId, document } = await drafted()
    const before = document.counts?.judgement_remaining ?? 0
    expect(before).toBeGreaterThan(0)

    const { document: saved } = await save(caseId, document.revision, [
      { id: 'requests', value: '피해 학생 보호 요청' },
      { id: 'investigator', value: 'assign' },
    ])

    expect(saved.fields.find((f) => f.id === 'requests')?.value).toBe('피해 학생 보호 요청')
    expect(saved.fields.find((f) => f.id === 'investigator')?.value).toBe('assign')
    expect(saved.counts?.judgement_remaining).toBe(before - 2)
    // 판단 칸은 처음부터 사람이 쓰는 칸이라 교사 수정 표시가 붙지 않는다.
    expect(saved.fields.find((f) => f.id === 'requests')?.edited).toBe(false)
    // 사안 상세의 서류 요약에도 반영된다.
    const detail = await apiFetch<SchoolViolenceCaseResponse>(`${SV}/${caseId}`)
    expect(detail.case.documents.find((d) => d.form_id === '1-3')?.counts).toEqual(saved.counts)
  })

  it('오래된 개정 번호로 보낸 저장은 거절되고 내용은 바뀌지 않는다', async () => {
    const { caseId, document } = await drafted()
    await save(caseId, document.revision, [{ id: 'requests', value: '먼저 저장' }])

    // 같은 개정 번호로 다시 보내면 오래된 것이다.
    const late = save(caseId, document.revision, [{ id: 'requests', value: '늦은 저장' }])
    expect(await statusOf(late)).toBe(409)

    const doc = await current(caseId)
    expect(doc.fields.find((f) => f.id === 'requests')?.value).toBe('먼저 저장')
  })

  it('없는 칸·사안 정보 칸·초안 없는 서류·너무 긴 값은 저장할 수 없다', async () => {
    const created = (await intake(await victimCounselId())).case
    // 초안이 없는 서류
    expect(await statusOf(save(created.id, 1, [{ id: 'requests', value: 'x' }]))).toBe(409)

    const { document } = await generate(created.id)
    const rev = document.revision
    expect(await statusOf(save(created.id, rev, [{ id: 'nope', value: 'x' }]))).toBe(422)
    // 사안 정보 칸은 서류에서 고치지 않는다.
    expect(await statusOf(save(created.id, rev, [{ id: 'school', value: 'x' }]))).toBe(422)
    // 판단 칸에는 검토 표시를 하지 않는다.
    expect(await statusOf(save(created.id, rev, [{ id: 'requests', reviewed: true }]))).toBe(422)
    const tooLong = [{ id: 'requests', value: 'x'.repeat(6001) }]
    expect(await statusOf(save(created.id, rev, tooLong))).toBe(422)
    expect(await statusOf(save('sv_none', 1, []))).toBe(404)
    // 거절된 저장은 개정 번호를 올리지 않는다.
    expect((await current(created.id)).revision).toBe(rev)
  })

  it('AI 칸이 하나라도 검토되지 않았으면 승인이 거절된다', async () => {
    const { caseId, document } = await drafted()
    const [, ...rest] = reviewAll(document.fields)
    const { document: partly } = await save(caseId, document.revision, rest)

    expect(await statusOf(approve(caseId, partly.revision))).toBe(409)

    expect((await current(caseId)).status).toBe('reviewing')
  })

  it('AI 칸을 빈 값으로 저장해도 AI 칸으로 남아 검토 전에는 승인되지 않고 집계에도 그대로 센다', async () => {
    const { caseId, document } = await drafted()
    const [target, ...others] = document.fields.filter(isAiField)
    const { document: emptied } = await save(caseId, document.revision, [
      { id: target.id, value: '' },
    ])

    const field = emptied.fields.find((f) => f.id === target.id)
    expect(field).toMatchObject({ value: '', reviewed: false, edited: true })
    expect(emptied.counts?.ai).toBe(document.counts?.ai)

    // 나머지만 검토해서는 승인되지 않는다.
    const { document: partly } = await save(
      caseId,
      emptied.revision,
      others.map((f) => ({ id: f.id, reviewed: true })),
    )
    expect(await statusOf(approve(caseId, partly.revision))).toBe(409)

    // 교사가 빈 칸을 확인했다고 표시하면 승인할 수 있다.
    const { document: reviewed } = await save(caseId, partly.revision, [
      { id: target.id, reviewed: true },
    ])
    expect((await approve(caseId, reviewed.revision)).document.status).toBe('approved')
  })

  it('AI 칸을 모두 검토하면 판단 칸이 비어 있어도 승인되고, 남은 판단 칸 수는 계속 센다', async () => {
    const { caseId, document } = await drafted()
    const { document: reviewed } = await save(caseId, document.revision, reviewAll(document.fields))
    expect(reviewed.counts?.ai_reviewed).toBe(reviewed.counts?.ai)
    expect(reviewed.counts?.judgement_remaining).toBeGreaterThan(0)

    const { document: approved } = await approve(caseId, reviewed.revision)

    expect(approved.status).toBe('approved')
    expect(approved.counts?.judgement_remaining).toBe(reviewed.counts?.judgement_remaining)
    // 사안 상세: 서류 상태·진행률·단계가 바뀐다.
    const detail = await apiFetch<SchoolViolenceCaseResponse>(`${SV}/${caseId}`)
    expect(detail.case.documents.find((d) => d.form_id === '1-3')?.status).toBe('approved')
    expect(detail.case.progress).toEqual({ approved: 1, total: 2 })
    expect(detail.case.stage).toBe('investigation')
    // 사안 목록에도 반영된다.
    const list = await apiFetch<SchoolViolenceCaseListResponse>(SV)
    expect(list.cases[0].stage).toBe('investigation')
    expect(list.cases[0].progress).toEqual({ approved: 1, total: 2 })
  })

  it('승인한 뒤에도 판단 칸은 채울 수 있고 승인은 유지된다. AI 칸을 고치면 검토 중으로 돌아간다', async () => {
    const { caseId, document } = await drafted()
    const { document: reviewed } = await save(caseId, document.revision, reviewAll(document.fields))
    const { document: approved } = await approve(caseId, reviewed.revision)

    const { document: filled } = await save(caseId, approved.revision, [
      { id: 'requests', value: '결재 전에 채움' },
    ])
    expect(filled.status).toBe('approved')

    const aiId = filled.fields.find((f) => f.kind === 'narrative' && f.value !== '')?.id ?? ''
    const { document: edited } = await save(caseId, filled.revision, [
      { id: aiId, value: '승인 뒤 고침' },
    ])
    expect(edited.status).toBe('reviewing')
    const detail = await apiFetch<SchoolViolenceCaseResponse>(`${SV}/${caseId}`)
    expect(detail.case.progress.approved).toBe(0)
    expect(detail.case.stage).toBe('intake')
  })

  it('승인도 오래된 개정 번호나 초안 없는 서류는 거절한다', async () => {
    const created = (await intake(await victimCounselId())).case
    expect(await statusOf(approve(created.id, 1))).toBe(409)

    const { document } = await generate(created.id)
    const all = reviewAll(document.fields)
    const { document: reviewed } = await save(created.id, document.revision, all)
    expect(await statusOf(approve(created.id, document.revision))).toBe(409)
    expect(await statusOf(approve(created.id, reviewed.revision))).toBe(200)
    expect(await statusOf(approve('sv_none', 1))).toBe(404)
  })

  it('덮어쓰기 확인 없이 초안을 다시 만들면 거절되고 확인하면 새 초안으로 바뀐다', async () => {
    const { caseId, document } = await drafted()
    const { document: edited } = await save(caseId, document.revision, [
      { id: 'requests', value: '고친 내용' },
    ])

    expect(await statusOf(generate(caseId))).toBe(409)
    expect(await statusOf(generate(caseId, { overwrite_confirmed: false }))).toBe(409)
    // 거절되면 고친 내용이 그대로 있다.
    const kept = await current(caseId)
    expect(kept.fields.find((f) => f.id === 'requests')?.value).toBe('고친 내용')

    const { document: regenerated } = await generate(caseId, { overwrite_confirmed: true })
    expect(regenerated.status).toBe('reviewing')
    expect(regenerated.fields.find((f) => f.id === 'requests')?.value).toBe('')
    expect(regenerated.revision).toBeGreaterThan(edited.revision)
  })

  it('승인한 서류를 확인하고 다시 만들면 승인이 풀리고 사안 단계도 돌아간다', async () => {
    const { caseId, document } = await drafted()
    const { document: reviewed } = await save(caseId, document.revision, reviewAll(document.fields))
    await approve(caseId, reviewed.revision)

    const { document: regenerated } = await generate(caseId, { overwrite_confirmed: true })

    expect(regenerated.status).toBe('reviewing')
    const detail = await apiFetch<SchoolViolenceCaseResponse>(`${SV}/${caseId}`)
    expect(detail.case.stage).toBe('intake')
  })
})

describe('사안 정보 수정', () => {
  const infoPath = (caseId: string) => `${SV}/${caseId}/info`
  const patchInfo = (caseId: string, body: object) =>
    apiFetch<SchoolViolenceCaseResponse>(infoPath(caseId), { method: 'PATCH', body })
  const intake13 = async () => {
    const { case: created } = await intake(await victimCounselId())
    await apiFetch<SchoolViolenceDocumentResponse>(`${SV}/${created.id}/documents/1-3/draft`, {
      method: 'POST',
      body: {},
    })
    return created
  }
  const fieldsOf = async (caseId: string) => {
    const { document } = await apiFetch<SchoolViolenceDocumentResponse>(
      `${SV}/${caseId}/documents/1-3`,
    )
    return Object.fromEntries(document.fields.map((f) => [f.id, f]))
  }

  it('사안번호·책임교사·교감을 고치면 사안 상세와 목록에 바로 보인다', async () => {
    const created = await intake13()

    const { case: updated } = await patchInfo(created.id, {
      case_number: '2026-31',
      teacher_name: '김다온',
      vice_principal: '박정호',
    })

    expect(updated.info.case_number).toBe('2026-31')
    expect(updated.info.teacher_name).toBe('김다온')
    expect(updated.info.vice_principal).toBe('박정호')
    // 보내지 않은 항목은 그대로다.
    expect(updated.info.students).toEqual(created.info.students)
    expect(updated.info.school_name).toBe(created.info.school_name)
    expect(updated.info.received_at).toBe(created.info.received_at)

    const fetched = await apiFetch<SchoolViolenceCaseResponse>(`${SV}/${created.id}`)
    expect(fetched.case.info).toEqual(updated.info)
    const { cases } = await apiFetch<SchoolViolenceCaseListResponse>(SV)
    expect(cases[0].case_number).toBe('2026-31')
  })

  it('사안 정보를 고치면 이미 만든 1-3의 공유 칸 값이 바뀐다', async () => {
    const created = await intake13()
    const before = await fieldsOf(created.id)
    expect(before['separation.enforced'].value).toBe('')

    await patchInfo(created.id, {
      case_number: '2026-31',
      teacher_name: '김다온',
      vice_principal: '박정호',
      separation: { enforced: true, period: '2026. 11. 16. ~ 11. 27.', exception_reasons: [] },
    })

    const after = await fieldsOf(created.id)
    expect(after.case_number.value).toBe('2026-31')
    expect(after.teacher.value).toBe('김다온')
    expect(after.vice_principal.value).toBe('박정호')
    expect(after['separation.enforced'].value).toBe('enforced')
    expect(after['separation.period'].value).toBe('2026. 11. 16. ~ 11. 27.')
    // 사안 정보 칸이라 교사 수정 표시도, 인용도 붙지 않는다.
    expect(after.case_number.edited).toBe(false)
    expect(after.case_number.evidence).toEqual([])
    // 사안 정보와 상관없는 칸은 그대로다.
    expect(after.facts).toEqual(before.facts)
    expect(after.reporter).toEqual(before.reporter)

    // 분리하지 않는 경우: 예외 사유가 칸에 실린다.
    await patchInfo(created.id, {
      separation: { enforced: false, period: null, exception_reasons: ['victim_objection'] },
    })
    const unseparated = await fieldsOf(created.id)
    expect(unseparated['separation.enforced'].value).toBe('not_enforced')
    expect(unseparated['separation.period'].value).toBe('')
    expect(unseparated['separation.exceptions'].value).toBe('victim_objection')
  })

  it('조사 중에 확인된 관련 학생을 추가하면 서류의 관련 학생 칸에도 반영된다', async () => {
    const created = await intake13()
    const newStudent = {
      name: '오하준',
      grade: 2,
      class: 3,
      number: 30,
      gender: 'male',
      role: 'witness',
      guardian_notice: { notified: false, at: null, method: null },
      note: '이주배경학생',
      found_during_investigation: true,
    }

    const { case: updated } = await patchInfo(created.id, {
      students: [...created.info.students, newStudent],
    })

    expect(updated.info.students.map((s) => s.name)).toEqual([
      '한지우',
      '정민혁',
      '박도윤',
      '최서진',
      '오하준',
    ])
    expect(updated.info.students[4]).toEqual(newStudent)
    const fields = await fieldsOf(created.id)
    expect(fields.students.value).toContain('오하준')
    expect(fields.students.value).toContain('목격')
    expect(fields.students.value).toContain('이주배경학생')

    const { cases } = await apiFetch<SchoolViolenceCaseListResponse>(SV)
    expect(cases[0].students).toHaveLength(5)
  })

  it('관련 학생을 고치거나 빼면 서류의 관련 학생 칸도 따라 바뀐다', async () => {
    const created = await intake13()
    const [victim, ...others] = created.info.students

    await patchInfo(created.id, {
      students: [
        {
          ...victim,
          guardian_notice: { notified: true, at: '2026-11-13T21:00:00+09:00', method: '대면' },
        },
        ...others.slice(0, 2),
      ],
    })

    const fields = await fieldsOf(created.id)
    expect(fields.students.value).toContain('대면')
    expect(fields.students.value).not.toContain('최서진')
  })

  it('빈 사안 정보를 거절하는 문구는 항목마다 받침에 맞는 조사를 쓴다', async () => {
    const created = await intake13()
    const detailOf = async (body: object) => {
      try {
        await patchInfo(created.id, body)
      } catch (error) {
        if (error instanceof ApiError) return (error.body as { detail: string }).detail
        throw error
      }
      return null
    }

    expect(await detailOf({ case_number: ' ' })).toBe('사안번호를 입력해 주세요.')
    expect(await detailOf({ teacher_name: ' ' })).toBe('책임교사를 입력해 주세요.')
    expect(await detailOf({ vice_principal: ' ' })).toBe('교감을 입력해 주세요.')
  })

  it('잘못된 사안 정보나 없는 사안은 거절되고 값은 바뀌지 않는다', async () => {
    const created = await intake13()
    const [first] = created.info.students

    expect(await statusOf(patchInfo('sv_none', { case_number: '1' }))).toBe(404)
    expect(await statusOf(patchInfo(created.id, { case_number: '  ' }))).toBe(422)
    expect(await statusOf(patchInfo(created.id, { students: [] }))).toBe(422)
    // 이름이 겹치는 학생은 서류에서 구별되지 않는다.
    expect(await statusOf(patchInfo(created.id, { students: [first, first] }))).toBe(422)
    expect(await statusOf(patchInfo(created.id, { students: [{ ...first, role: 'bully' }] }))).toBe(
      422,
    )
    expect(await statusOf(patchInfo(created.id, { students: [{ ...first, number: 0 }] }))).toBe(422)
    expect(
      await statusOf(
        patchInfo(created.id, {
          separation: { enforced: false, period: null, exception_reasons: ['nope'] },
        }),
      ),
    ).toBe(422)

    const fetched = await apiFetch<SchoolViolenceCaseResponse>(`${SV}/${created.id}`)
    expect(fetched.case.info).toEqual(created.info)
  })
})

describe('2-4 사안조사 보고서 초안', () => {
  const docPath = (caseId: string) => `${SV}/${caseId}/documents/2-4`
  const generate = (caseId: string, body: object = {}) =>
    apiFetch<SchoolViolenceDocumentResponse>(`${docPath(caseId)}/draft`, { method: 'POST', body })
  const save = (caseId: string, revision: number, fields: object[]) =>
    apiFetch<SchoolViolenceDocumentResponse>(`${docPath(caseId)}/save`, {
      method: 'POST',
      body: { revision, fields },
    })
  const approve = (caseId: string, revision: number) =>
    apiFetch<SchoolViolenceDocumentResponse>(`${docPath(caseId)}/approve`, {
      method: 'POST',
      body: { revision },
    })
  const OFFENDERS = ['정민혁', '박도윤', '최서진']
  const FACTOR_KEYS = ['severity', 'persistence', 'intent', 'remorse', 'reconcile']

  async function intakeCase(extra: Partial<IntakeSchoolViolenceCaseRequest> = {}) {
    return (await intake(await victimCounselId(), extra)).case
  }

  it('조사 자료가 붙어 있는 사안은 잠기지 않고 초안을 만들 수 있다', async () => {
    const created = await intakeCase()
    const summary = created.documents.find((d) => d.form_id === '2-4')

    expect(summary?.available).toBe(true)
    expect(summary?.locked_reason).toBeNull()
    expect((await generate(created.id)).document.status).toBe('reviewing')
  })

  it('조사 자료(진술서·면담 전사)가 없으면 2-4가 잠기고 초안 생성이 거절된다', async () => {
    // 접수 요청의 demo_material_kinds로 시연용 조사 자료를 하나도 붙이지 않은 사안을 만든다.
    const created = await intakeCase({ demo_material_kinds: [] })
    expect(created.materials.some((m) => m.demo_preloaded)).toBe(false)
    expect(created.materials.some((m) => m.kind === 'counsel_record')).toBe(true)

    const { case: detail } = await apiFetch<SchoolViolenceCaseResponse>(`${SV}/${created.id}`)
    const locked = detail.documents.find((d) => d.form_id === '2-4')
    expect(locked?.locked_reason).toContain('조사 자료')
    expect(await statusOf(generate(created.id))).toBe(409)
    // 거절되면 서류는 그대로 초안 없음이다.
    const { document } = await apiFetch<SchoolViolenceDocumentResponse>(docPath(created.id))
    expect(document.status).toBe('none')
    expect(document.fields).toEqual([])
    // 잠긴 건 2-4뿐이다. 상담 기록만으로 쓰는 1-3은 그대로 만들 수 있다.
    expect(detail.documents.find((d) => d.form_id === '1-3')?.locked_reason).toBeNull()
    const draft13 = await apiFetch<SchoolViolenceDocumentResponse>(
      `${SV}/${created.id}/documents/1-3/draft`,
      { method: 'POST', body: {} },
    )
    expect(draft13.document.status).toBe('reviewing')
  })

  it('시연용 조사 자료 종류에 허용되지 않는 값을 보내면 접수가 거절되고 사안은 늘지 않는다', async () => {
    const counselId = await victimCounselId()
    expect(await statusOf(intake(counselId, { demo_material_kinds: ['history' as never] }))).toBe(
      422,
    )
    expect(await statusOf(intake(counselId, { demo_material_kinds: 'statement' as never }))).toBe(
      422,
    )
    const { cases } = await apiFetch<SchoolViolenceCaseListResponse>(SV)
    expect(cases).toHaveLength(0)
  })

  it('진술서만 있어도 조사 자료가 있는 것으로 본다', async () => {
    const created = await intakeCase({ demo_material_kinds: ['statement'] })
    expect(created.materials.filter((m) => m.demo_preloaded).map((m) => m.kind)).toEqual([
      'statement',
      'statement',
      'statement',
    ])

    expect((await generate(created.id)).document.status).toBe('reviewing')
  })

  it('초안을 만들면 쟁점 2개와 가해 관련 학생별 판단요소 칸이 구조적인 id로 생긴다', async () => {
    const created = await intakeCase()

    const { document } = await generate(created.id)
    const ids = document.fields.map((f) => f.id)

    expect(document.status).toBe('reviewing')
    expect(new Set(ids).size).toBe(ids.length)
    for (const n of [1, 2]) {
      expect(ids).toEqual(
        expect.arrayContaining([
          `issue.${n}.title`,
          `issue.${n}.victim_claim`,
          `issue.${n}.victim_evidence`,
          `issue.${n}.offender_claim`,
          `issue.${n}.offender_evidence`,
          `issue.${n}.witness_claim`,
          `issue.${n}.witness_evidence`,
        ]),
      )
    }
    expect(ids).not.toContain('issue.3.title')
    for (const name of OFFENDERS) {
      for (const key of FACTOR_KEYS) expect(ids).toContain(offenderFieldId(key, name))
    }
    // 피해 관련 학생의 칸은 가해 관련 학생별 칸으로 나뉘지 않는다.
    expect(ids).not.toContain(offenderFieldId('severity', '한지우'))
    // 사안 정보를 공유하는 칸(관련 학생·분리 여부)이 있다.
    const byId = Object.fromEntries(document.fields.map((f) => [f.id, f]))
    expect(byId.students.kind).toBe('admin')
    expect(byId['separation.enforced'].kind).toBe('admin')
    expect(byId.case_number.value).toBe(created.info.case_number)
  })

  it('AI 칸에는 근거 인용이 있고 인용문은 해당 사안 자료 원문에 들어 있다', async () => {
    const created = await intakeCase()
    const { document } = await generate(created.id)

    const aiFields = document.fields.filter((f) => f.kind === 'narrative')
    expect(aiFields.length).toBeGreaterThan(20)
    for (const field of aiFields) {
      expect(field.value, field.id).not.toBe('')
      expect(field.evidence.length, field.id).toBeGreaterThan(0)
      for (const { source_id, quote } of field.evidence) {
        const material = created.materials.find((m) => m.id === source_id)
        expect(material, `${field.id}의 출처 ${source_id}`).toBeDefined()
        expect(material?.body, `${field.id}의 인용 「${quote}」`).toContain(quote)
      }
    }
  })

  it('판단 칸은 비어 있고 인용도 없다: 1차/보완 구분·자체해결 의견·긴급조치·재발 현황·선도 가능성', async () => {
    const created = await intakeCase()
    const { document } = await generate(created.id)

    const judgement = document.fields.filter((f) => f.kind === 'manual' || f.kind === 'sensitive')
    expect(judgement.every((f) => f.value === '' && f.evidence.length === 0)).toBe(true)
    expect(judgement.map((f) => f.id)).toEqual(
      expect.arrayContaining([
        'round',
        'self_resolution.1.opinion',
        'self_resolution.4.opinion',
        'urgent.victim',
        'urgent.offender',
        'disability',
        ...OFFENDERS.map((name) => offenderFieldId('recurrence', name)),
        ...OFFENDERS.map((name) => offenderFieldId('education', name)),
      ]),
    )
    expect(document.counts?.judgement_remaining).toBe(judgement.length)
  })

  it('가해 관련 학생별 칸은 그 학생의 사실만 담는다', async () => {
    const created = await intakeCase()
    const { document } = await generate(created.id)
    const byId = Object.fromEntries(document.fields.map((f) => [f.id, f]))

    expect(byId[offenderFieldId('severity', '정민혁')].value).toContain('9회')
    expect(byId[offenderFieldId('severity', '박도윤')].value).toContain('8회')
    expect(byId[offenderFieldId('severity', '최서진')].value).toContain('6회')
    expect(byId[offenderFieldId('severity', '박도윤')].value).not.toContain('정민혁')
    expect(byId[offenderFieldId('remorse', '최서진')].value).toContain('사과')
  })

  it('편집·검토·승인이 1-3과 같은 규칙으로 되고, 판단 칸이 비어 있어도 승인된다', async () => {
    const created = await intakeCase()
    const { document } = await generate(created.id)
    const aiIds = document.fields.filter((f) => f.kind === 'narrative').map((f) => f.id)

    // 일부만 검토하면 승인이 거절된다.
    const partly = await save(
      created.id,
      document.revision,
      aiIds.slice(1).map((id) => ({ id, reviewed: true })),
    )
    expect(await statusOf(approve(created.id, partly.document.revision))).toBe(409)

    const filled = await save(created.id, partly.document.revision, [
      { id: 'round', value: 'first' },
      { id: aiIds[0], reviewed: true },
    ])
    expect(filled.document.fields.find((f) => f.id === 'round')?.value).toBe('first')
    const { document: approved } = await approve(created.id, filled.document.revision)
    expect(approved.status).toBe('approved')
    expect(approved.counts?.judgement_remaining).toBeGreaterThan(0)

    // 1-3은 승인 전이라 단계는 접수 그대로이고, 2-4만 승인돼 진행률은 1/2이다.
    const { case: detail } = await apiFetch<SchoolViolenceCaseResponse>(`${SV}/${created.id}`)
    expect(detail.progress).toEqual({ approved: 1, total: 2 })
    expect(detail.stage).toBe('intake')
  })

  it('덮어쓰기 확인 없이 2-4를 다시 만들면 거절되고 확인하면 새 초안이 된다', async () => {
    const created = await intakeCase()
    const { document } = await generate(created.id)
    await save(created.id, document.revision, [{ id: 'urgent.victim', value: '제1호' }])

    expect(await statusOf(generate(created.id))).toBe(409)
    const kept = await apiFetch<SchoolViolenceDocumentResponse>(docPath(created.id))
    expect(kept.document.fields.find((f) => f.id === 'urgent.victim')?.value).toBe('제1호')

    const regenerated = await generate(created.id, { overwrite_confirmed: true })
    expect(regenerated.document.fields.find((f) => f.id === 'urgent.victim')?.value).toBe('')
  })
})

describe('관련 학생이 바뀔 때 2-4의 가해 관련 학생별 칸', () => {
  const docPath = (caseId: string) => `${SV}/${caseId}/documents/2-4`
  const PER_OFFENDER_KEYS = [
    'severity',
    'persistence',
    'intent',
    'remorse',
    'reconcile',
    'education',
    'recurrence',
  ]

  async function draft24() {
    const { case: created } = await intake(await victimCounselId())
    const { document } = await apiFetch<SchoolViolenceDocumentResponse>(
      `${docPath(created.id)}/draft`,
      { method: 'POST', body: {} },
    )
    return { created, document }
  }
  const patchStudents = (caseId: string, students: object[]) =>
    apiFetch<SchoolViolenceCaseResponse>(`${SV}/${caseId}/info`, {
      method: 'PATCH',
      body: { students },
    })
  const fieldsOf = async (caseId: string) => {
    const { document } = await apiFetch<SchoolViolenceDocumentResponse>(docPath(caseId))
    return { document, byId: Object.fromEntries(document.fields.map((f) => [f.id, f])) }
  }
  const newOffender = {
    name: '오하준',
    grade: 2,
    class: 3,
    number: 30,
    gender: 'male',
    role: 'offender',
    guardian_notice: { notified: false, at: null, method: null },
    note: '조사 중 확인',
    found_during_investigation: true,
  }

  it('가해 관련 학생을 추가하면 판단요소마다 그 학생의 빈 판단 칸이 생긴다', async () => {
    const { created, document } = await draft24()

    await patchStudents(created.id, [...created.info.students, newOffender])

    const { document: after, byId } = await fieldsOf(created.id)
    for (const key of PER_OFFENDER_KEYS) {
      const field = byId[offenderFieldId(key, '오하준')]
      expect(field, key).toBeDefined()
      expect(field.value).toBe('')
      expect(field.evidence).toEqual([])
      expect(field.kind).toBe('manual')
      expect(field.label).toContain('오하준')
      expect(field.label).not.toContain('정민혁')
    }
    // 다른 학생의 칸은 그대로고 개정 번호가 올랐다.
    expect(byId[offenderFieldId('severity', '정민혁')]).toEqual(
      document.fields.find((f) => f.id === offenderFieldId('severity', '정민혁')),
    )
    expect(after.revision).toBeGreaterThan(document.revision)
    expect(after.counts?.judgement).toBe(
      (document.counts?.judgement ?? 0) + PER_OFFENDER_KEYS.length,
    )
  })

  it('가해 관련 학생을 빼거나 구분을 바꾸면 그 학생의 칸이 사라지고 다른 학생이 고친 값은 남는다', async () => {
    const { created, document } = await draft24()
    await apiFetch(`${docPath(created.id)}/save`, {
      method: 'POST',
      body: {
        revision: document.revision,
        fields: [{ id: offenderFieldId('recurrence', '정민혁'), value: '없음' }],
      },
    })
    const [victim, minhyuk, doyun] = created.info.students

    // 최서진은 명단에서 빠지고, 박도윤은 목격 학생이 된다.
    await patchStudents(created.id, [victim, minhyuk, { ...doyun, role: 'witness' }])

    const { byId } = await fieldsOf(created.id)
    for (const name of ['최서진', '박도윤']) {
      for (const key of PER_OFFENDER_KEYS) expect(byId[offenderFieldId(key, name)]).toBeUndefined()
    }
    expect(byId[offenderFieldId('severity', '정민혁')].value).toContain('9회')
    expect(byId[offenderFieldId('recurrence', '정민혁')].value).toBe('없음')
  })

  it('바뀐 게 없으면 개정 번호가 오르지 않고, 초안 없는 2-4는 칸이 생기지 않는다', async () => {
    const { created, document } = await draft24()
    await patchStudents(created.id, created.info.students)
    expect((await fieldsOf(created.id)).document.revision).toBe(document.revision)

    await apiFetch('/api/demo/reset', { method: 'POST' })
    const { case: fresh } = await intake(await victimCounselId())
    await patchStudents(fresh.id, [...fresh.info.students, newOffender])
    expect((await fieldsOf(fresh.id)).document.fields).toEqual([])
  })

  it('관련 학생을 먼저 고친 뒤 초안을 만들면 초안도 지금의 가해 관련 학생 명단을 따른다', async () => {
    const { case: created } = await intake(await victimCounselId())
    const [victim, minhyuk, doyun] = created.info.students
    await patchStudents(created.id, [victim, minhyuk, doyun, newOffender])

    const { document } = await apiFetch<SchoolViolenceDocumentResponse>(
      `${docPath(created.id)}/draft`,
      { method: 'POST', body: {} },
    )

    const byId = Object.fromEntries(document.fields.map((f) => [f.id, f]))
    expect(byId[offenderFieldId('severity', '정민혁')].value).toContain('9회')
    expect(byId[offenderFieldId('severity', '오하준')].value).toBe('')
    expect(byId[offenderFieldId('severity', '최서진')]).toBeUndefined()
  })
})
