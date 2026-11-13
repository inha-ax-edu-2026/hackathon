import { describe, expect, it } from 'vitest'
import type {
  CaseListResponse,
  CounselForm,
  CreateCaseResponse,
  JudgmentResponse,
  SendMessageResponse,
  StudentCaseDetailResponse,
} from '@/api/counselTypes.ts'
import { ApiError, apiFetch } from '@/lib/api.ts'
import { DEMO_LINES } from '@/lib/counsel/demoLines.ts'

const FORM: CounselForm = {
  topic: '교우관계',
  answers: [
    { question: '지금 기분은 어때요? (1~5)', answer: '2' },
    { question: '어떤 고민이 있나요?', answer: '친구 관계가 신경 쓰여요.' },
  ],
}

function createCase(form: CounselForm = FORM) {
  return apiFetch<CreateCaseResponse>('/api/student/counsel/cases', {
    method: 'POST',
    body: { form },
  })
}

let requestSeq = 0
function say(id: string, text: string) {
  requestSeq += 1
  return apiFetch<SendMessageResponse>(`/api/student/counsel/cases/${id}/messages`, {
    method: 'POST',
    body: { text, request_id: `r_test_${requestSeq}` },
  })
}

function handoff(id: string) {
  return apiFetch<JudgmentResponse>(`/api/student/counsel/cases/${id}/handoff`, {
    method: 'POST',
  })
}

function finish(id: string) {
  return apiFetch<JudgmentResponse>(`/api/student/counsel/cases/${id}/finish`, {
    method: 'POST',
  })
}

function studentCases() {
  return apiFetch<CaseListResponse>('/api/student/counsel/cases')
}

function teacherCases() {
  return apiFetch<CaseListResponse>('/api/teacher/counsel/cases')
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

describe('상담 건 만들기', () => {
  it('상담 양식을 내면 진행 중 상담 건과 첫 bot 인사가 생긴다', async () => {
    const created = await createCase()

    expect(created.case.kind).toBe('chatbot')
    expect(created.case.status).toBe('in_progress')
    expect(created.case.title).toBe('[AI 챗봇] 교우관계 상담')
    expect(created.case.risk).toBeNull()
    expect(created.case.handoff).toBeNull()
    expect(created.messages).toHaveLength(1)
    expect(created.messages[0].role).toBe('bot')
    expect(created.messages[0].text.length).toBeGreaterThan(0)
  })

  it('학생 목록에는 보이고 교사 목록에는 보이지 않는다', async () => {
    const { case: created } = await createCase()

    const student = await studentCases()
    const teacher = await teacherCases()

    expect(student.cases[0].id).toBe(created.id)
    expect(student.cases[0].status).toBe('in_progress')
    expect(teacher.cases.some((c) => c.id === created.id)).toBe(false)
  })

  it('다시 열면 양식과 메시지가 함께 온다', async () => {
    const { case: created } = await createCase()
    await say(created.id, '요즘 학교 생활이 좀 그래')

    const detail = await apiFetch<StudentCaseDetailResponse>(
      `/api/student/counsel/cases/${created.id}`,
    )

    expect(detail.case.id).toBe(created.id)
    expect(detail.form).toEqual(FORM)
    expect(detail.messages.map((m) => m.role)).toEqual(['bot', 'student', 'bot'])
    expect(detail.messages[1].text).toBe('요즘 학교 생활이 좀 그래')
  })

  it('없는 상담 건을 열면 404', async () => {
    expect(await statusOf(apiFetch('/api/student/counsel/cases/c_none'))).toBe(404)
  })

  it('주제가 빈 양식은 거절된다', async () => {
    expect(await statusOf(createCase({ topic: '', answers: [] }))).toBe(422)
  })

  it('시연 초기화하면 만든 상담 건이 학생·교사 목록에서 모두 사라진다', async () => {
    const { case: created } = await createCase()
    await finish(created.id)

    await apiFetch('/api/demo/reset', { method: 'POST' })

    const student = await studentCases()
    const teacher = await teacherCases()
    expect(student.cases.some((c) => c.id === created.id)).toBe(false)
    expect(teacher.cases.some((c) => c.id === created.id)).toBe(false)
    expect(teacher.cases.every((c) => c.kind === 'individual')).toBe(true)
  })
})

describe('발화 보내기와 판단 규칙', () => {
  it('키워드 없는 발화는 챗봇이 답하고 전환되지 않는다', async () => {
    const { case: created } = await createCase()

    const sent = await say(created.id, '오늘 수학 시간에 발표했어')

    expect(sent.student_message.role).toBe('student')
    expect(sent.bot_message?.role).toBe('bot')
    expect(sent.judgment).toEqual({
      handed_off: false,
      handoff_reason: null,
      detected_keywords: [],
      risk: null,
    })
    expect(sent.case.status).toBe('in_progress')
  })

  it('심각 키워드 1번이면 즉시 전환되고 위험도 높음, 챗봇 답은 없다', async () => {
    const { case: created } = await createCase()

    const sent = await say(created.id, '그냥 다 그만두고 죽고 싶어')

    expect(sent.bot_message).toBeNull()
    expect(sent.judgment).toEqual({
      handed_off: true,
      handoff_reason: 'keyword',
      detected_keywords: ['죽고 싶'],
      risk: 'high',
    })
    expect(sent.case.status).toBe('awaiting_approval')
    expect(sent.case.risk).toBe('high')
    expect(sent.case.handoff?.reason).toBe('keyword')
    expect(sent.case.handoff?.detected_keywords).toEqual(['죽고 싶'])
  })

  it('전환된 건은 교사 목록에 승인대기로 올라온다', async () => {
    const { case: created } = await createCase()
    await say(created.id, '어제 형한테 맞았어')

    const { cases } = await teacherCases()
    const listed = cases.find((c) => c.id === created.id)

    expect(listed?.status).toBe('awaiting_approval')
    expect(listed?.read).toBe(false)
    expect(cases[0].id).toBe(created.id)
  })

  it('경미 키워드 발화 2번은 전환되지 않고 3번째에 전환되며 위험도 보통', async () => {
    const { case: created } = await createCase()

    const first = await say(created.id, '요즘 좀 힘들어')
    const second = await say(created.id, '혼자 있으면 외로워')
    expect(first.judgment.handed_off).toBe(false)
    expect(second.judgment.handed_off).toBe(false)
    expect(second.judgment.detected_keywords).toEqual(['힘들', '외로'])

    const third = await say(created.id, '시험이 불안해')

    expect(third.bot_message).toBeNull()
    expect(third.judgment).toEqual({
      handed_off: true,
      handoff_reason: 'keyword',
      detected_keywords: ['힘들', '외로', '불안'],
      risk: 'medium',
    })
    expect(third.case.status).toBe('awaiting_approval')
  })

  it('한 발화에 경미 키워드가 여러 개여도 1번으로 센다', async () => {
    const { case: created } = await createCase()

    const first = await say(created.id, '힘들고 무서워서 외로워')
    const second = await say(created.id, '그냥 그래')
    const third = await say(created.id, '학교가 불안해')

    expect(first.judgment.handed_off).toBe(false)
    expect(first.judgment.detected_keywords).toEqual(['힘들', '무서', '외로'])
    expect(second.judgment.handed_off).toBe(false)
    expect(third.judgment.handed_off).toBe(false)
    expect(third.case.status).toBe('in_progress')
  })

  it('경미 키워드 발화는 연속이 아니어도 누적된다', async () => {
    const { case: created } = await createCase()

    await say(created.id, '힘들어')
    await say(created.id, '오늘 날씨 좋다')
    await say(created.id, '무서워')
    const fourth = await say(created.id, '불안해')

    expect(fourth.judgment.handed_off).toBe(true)
  })

  it('띄어쓰기가 다른 표기도 키워드로 잡는다', async () => {
    const { case: created } = await createCase()

    const severe = await say(created.id, '사라지고싶 다는 생각을 해')

    expect(severe.judgment.handed_off).toBe(true)
    expect(severe.judgment.detected_keywords).toEqual(['사라지고 싶'])

    const other = (await createCase()).case
    const mild = await say(other.id, '학교 가기싫어')
    expect(mild.judgment.detected_keywords).toEqual(['가기 싫'])
  })

  it('상담 양식의 글에 든 키워드는 세지 않는다', async () => {
    const { case: created } = await createCase({
      topic: '마음·건강',
      answers: [
        { question: '어떤 고민이 있나요?', answer: '죽고 싶을 만큼 힘들고 무섭고 불안해요' },
      ],
    })

    expect(created.status).toBe('in_progress')
    const sent = await say(created.id, '안녕')
    expect(sent.judgment.handed_off).toBe(false)
    expect(sent.judgment.detected_keywords).toEqual([])
  })

  it('선생님을 찾는 말에는 「선생님과 상담하기」 버튼을 안내하고 전환하지 않는다', async () => {
    const { case: created } = await createCase()

    const sent = await say(created.id, '선생님이랑 직접 얘기하고 싶어')

    expect(sent.judgment.handed_off).toBe(false)
    expect(sent.bot_message?.text).toContain('「선생님과 상담하기」')
  })

  it('같은 request_id로 다시 보내면 저장된 결과를 그대로 돌려준다', async () => {
    const { case: created } = await createCase()
    const send = () =>
      apiFetch<SendMessageResponse>(`/api/student/counsel/cases/${created.id}/messages`, {
        method: 'POST',
        body: { text: '힘들어', request_id: 'r_same' },
      })

    const first = await send()
    const again = await send()

    expect(again).toEqual(first)
    const detail = await apiFetch<StudentCaseDetailResponse>(
      `/api/student/counsel/cases/${created.id}`,
    )
    expect(detail.messages.filter((m) => m.role === 'student')).toHaveLength(1)
  })

  it('빈 발화는 거절된다', async () => {
    const { case: created } = await createCase()
    expect(await statusOf(say(created.id, '   '))).toBe(422)
  })
})

describe('「선생님과 상담하기」', () => {
  it('키워드가 없어도 학생 요청으로 전환되고 위험도는 보통', async () => {
    const { case: created } = await createCase()

    const res = await handoff(created.id)

    expect(res.judgment).toEqual({
      handed_off: true,
      handoff_reason: 'student_request',
      detected_keywords: [],
      risk: 'medium',
    })
    expect(res.case.status).toBe('awaiting_approval')
    expect(res.case.handoff?.reason).toBe('student_request')
  })
})

describe('전환 없이 끝내기', () => {
  it('경미 키워드 발화가 없으면 상담종료·위험도 낮음', async () => {
    const { case: created } = await createCase()
    await say(created.id, '이야기하니까 좀 나아졌어')

    const res = await finish(created.id)

    expect(res.judgment).toEqual({
      handed_off: false,
      handoff_reason: null,
      detected_keywords: [],
      risk: 'low',
    })
    expect(res.case.status).toBe('completed')
    expect(res.case.handoff).toBeNull()
  })

  it('경미 키워드 발화가 1번이라도 있으면 위험도 보통', async () => {
    const { case: created } = await createCase()
    await say(created.id, '조금 외로웠어')

    const res = await finish(created.id)

    expect(res.judgment.risk).toBe('medium')
    expect(res.case.risk).toBe('medium')
  })

  it('끝낸 건은 교사 목록에 상담종료로 올라온다', async () => {
    const { case: created } = await createCase()
    await finish(created.id)

    const { cases } = await teacherCases()

    expect(cases.find((c) => c.id === created.id)?.status).toBe('completed')
  })
})

describe('끝난 상담 건', () => {
  it('전환된 건에 발화·전환·끝내기를 보내면 409로 거절된다', async () => {
    const { case: created } = await createCase()
    await handoff(created.id)

    expect(await statusOf(say(created.id, '안녕'))).toBe(409)
    expect(await statusOf(handoff(created.id))).toBe(409)
    expect(await statusOf(finish(created.id))).toBe(409)
  })

  it('종료된 건에 발화를 보내면 409로 거절된다', async () => {
    const { case: created } = await createCase()
    await finish(created.id)

    expect(await statusOf(say(created.id, '안녕'))).toBe(409)
  })

  it('끝난 건도 다시 열면 대화를 읽을 수 있다', async () => {
    const { case: created } = await createCase()
    await say(created.id, '학교폭력 같은 일이 있었어')

    const detail = await apiFetch<StudentCaseDetailResponse>(
      `/api/student/counsel/cases/${created.id}`,
    )

    expect(detail.case.status).toBe('awaiting_approval')
    expect(detail.messages.map((m) => m.role)).toEqual(['bot', 'student'])
  })
})

describe('시연 문장', () => {
  it('차례로 보내면 앞의 두 발화에서는 전환되지 않고 세 번째에서 키워드로 전환된다', async () => {
    const { case: created } = await createCase()

    const [first, second, third] = [
      await say(created.id, DEMO_LINES[0]),
      await say(created.id, DEMO_LINES[1]),
      await say(created.id, DEMO_LINES[2]),
    ]

    expect(first.judgment.handed_off).toBe(false)
    expect(first.bot_message).not.toBeNull()
    expect(second.judgment.handed_off).toBe(false)
    expect(second.bot_message).not.toBeNull()
    expect(third.judgment.handed_off).toBe(true)
    expect(third.judgment.handoff_reason).toBe('keyword')
    expect(third.bot_message).toBeNull()
  })
})
