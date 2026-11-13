import { type DefaultBodyType, delay, HttpResponse, http, type PathParams } from 'msw'
import type {
  ApiErrorBody,
  CaseListResponse,
  CounselCase,
  CreateCaseRequest,
  CreateCaseResponse,
  JudgmentResponse,
  Message,
  SendMessageRequest,
  SendMessageResponse,
  StudentCaseDetailResponse,
} from '@/api/counselTypes.ts'
import { DEMO_STUDENT } from '@/lib/counsel/identity.ts'
import { apiUrl, errorJson } from '@/mocks/http.ts'
import { greeting, reply } from './bot.ts'
import { type Db, findCase, loadDb, newId, nowIso, type StoredCase, updateDb } from './db.ts'
import { keywordTriggered, pendingJudgment, scan } from './judgment.ts'
import { closeCase } from './outcome.ts'

/** 학생 상담 API 목(`/api/student/counsel/...`). 제안서 6.1~6.5 */

const CLOSED_DETAIL = '이미 끝났거나 선생님께 전달된 상담이에요.'
const NOT_FOUND_DETAIL = '상담 건을 찾을 수 없어요.'

const isMine = (c: CounselCase) =>
  c.student.grade === DEMO_STUDENT.grade &&
  c.student.class === DEMO_STUDENT.class &&
  c.student.number === DEMO_STUDENT.number

/** 학생 본인의 상담 건만 찾는다. */
const findMine = (db: Db, id: string) => {
  const stored = findCase(db, id)
  return stored && isMine(stored.case) ? stored : undefined
}

const message = (role: Message['role'], text: string): Message => ({
  id: newId('m'),
  role,
  text,
  at: nowIso(),
})

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

/** 핸들러 결과: 응답 본문 또는 오류(상태·문구). */
type Outcome<T> = { body: T } | { status: number; detail: string }

const respond = <T>(outcome: Outcome<T>) =>
  'body' in outcome
    ? HttpResponse.json(outcome.body as Record<string, unknown>)
    : errorJson(outcome.status, outcome.detail)

/** 진행 중인 내 상담 건에만 fn을 적용한다. 없으면 404, 진행 중이 아니면 409. */
function withOpenCase<T>(id: string, fn: (stored: StoredCase) => T): Outcome<T> {
  return updateDb((db) => {
    const stored = findMine(db, id)
    if (!stored) return { status: 404, detail: NOT_FOUND_DETAIL }
    if (stored.case.status !== 'in_progress') return { status: 409, detail: CLOSED_DETAIL }
    return { body: fn(stored) }
  })
}

export const studentHandlers = [
  // 6.1 상담 건 만들기: 진행 중 상담 건 + 첫 bot 인사
  http.post<PathParams, DefaultBodyType, CreateCaseResponse | ApiErrorBody>(
    apiUrl('/api/student/counsel/cases'),
    async ({ request }) => {
      const body = (await readJson(request)) as Partial<CreateCaseRequest> | null
      const form = body?.form
      if (
        !form ||
        typeof form.topic !== 'string' ||
        !form.topic.trim() ||
        !Array.isArray(form.answers)
      ) {
        return errorJson(422, '상담 주제를 골라 주세요.')
      }

      const at = nowIso()
      const stored: StoredCase = {
        case: {
          id: newId('c'),
          kind: 'chatbot',
          status: 'in_progress',
          title: `[AI 챗봇] ${form.topic} 상담`,
          student: DEMO_STUDENT,
          schedule: { at: null, method: null },
          risk: null,
          handoff: null,
          detected_keywords: [],
          read: false,
          created_at: at,
          updated_at: at,
        },
        form: { topic: form.topic, answers: form.answers },
        messages: [message('bot', greeting(form))],
        summary: null,
      }
      updateDb((db) => {
        db.cases.push(stored)
      })
      return HttpResponse.json<CreateCaseResponse>(
        { case: stored.case, messages: stored.messages },
        { status: 201 },
      )
    },
  ),

  // 6.2 내 상담 목록: 진행 중 포함, 최신순
  http.get(apiUrl('/api/student/counsel/cases'), () => {
    const cases = loadDb()
      .cases.map((stored) => stored.case)
      .filter(isMine)
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    return HttpResponse.json<CaseListResponse>({ cases })
  }),

  // 6.2 상담 건 다시 열기: 양식·메시지 포함
  http.get<PathParams, DefaultBodyType, StudentCaseDetailResponse | ApiErrorBody>(
    apiUrl('/api/student/counsel/cases/:id'),
    ({ params }) => {
      const stored = findMine(loadDb(), String(params.id))
      if (!stored) return errorJson(404, NOT_FOUND_DETAIL)
      return HttpResponse.json<StudentCaseDetailResponse>({
        case: stored.case,
        form: stored.form,
        messages: stored.messages,
      })
    },
  ),

  // 6.3 발화 보내기: 판단은 챗봇 답보다 먼저. 전환되는 발화에는 챗봇 답이 없다.
  http.post(apiUrl('/api/student/counsel/cases/:id/messages'), async ({ params, request }) => {
    const body = (await readJson(request)) as Partial<SendMessageRequest> | null
    const text = typeof body?.text === 'string' ? body.text.trim() : ''
    if (!text) return errorJson(422, '보낼 말을 입력해 주세요.')
    const requestId = typeof body?.request_id === 'string' ? body.request_id : null

    // 챗봇이 답을 쓰는 시간. 화면의 입력 중 표시가 보이게 한다(Node 테스트에서는 5ms).
    await delay()

    const id = String(params.id)
    const replayed = requestId ? findMine(loadDb(), id)?.replies?.[requestId] : undefined
    if (replayed) return HttpResponse.json<SendMessageResponse>(replayed)

    return respond(
      withOpenCase(id, (stored): SendMessageResponse => {
        const studentMessage = message('student', text)
        stored.messages.push(studentMessage)

        const s = scan(stored.messages)
        let response: SendMessageResponse
        if (keywordTriggered(s)) {
          const judgment = closeCase(stored, 'keyword')
          response = {
            student_message: studentMessage,
            bot_message: null,
            judgment,
            case: stored.case,
          }
        } else {
          const turns = stored.messages.filter((m) => m.role === 'student').length
          const botMessage = message(
            'bot',
            reply(stored.form ?? { topic: '기타', answers: [] }, text, turns),
          )
          stored.messages.push(botMessage)
          stored.case.detected_keywords = s.detected
          stored.case.updated_at = botMessage.at
          response = {
            student_message: studentMessage,
            bot_message: botMessage,
            judgment: pendingJudgment(s),
            case: stored.case,
          }
        }
        if (requestId) stored.replies = { ...stored.replies, [requestId]: response }
        return response
      }),
    )
  }),

  // 6.4 「선생님과 상담하기」: 학생 요청 전환
  http.post(apiUrl('/api/student/counsel/cases/:id/handoff'), ({ params }) =>
    respond(
      withOpenCase(
        String(params.id),
        (stored): JudgmentResponse => ({
          judgment: closeCase(stored, 'student_request'),
          case: stored.case,
        }),
      ),
    ),
  ),

  // 6.5 전환 없이 끝내기(학생의 「상담 끝내기」 버튼)
  http.post(apiUrl('/api/student/counsel/cases/:id/finish'), ({ params }) =>
    respond(
      withOpenCase(
        String(params.id),
        (stored): JudgmentResponse => ({ judgment: closeCase(stored, null), case: stored.case }),
      ),
    ),
  ),
]
