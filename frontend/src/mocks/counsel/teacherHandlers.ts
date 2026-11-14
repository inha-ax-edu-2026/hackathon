import { type DefaultBodyType, HttpResponse, http, type PathParams } from 'msw'
import type {
  ApiErrorBody,
  CaseListResponse,
  CaseResponse,
  DocumentKind,
  DocumentsResponse,
  TeacherCaseDetailResponse,
  UpdateDocumentRequest,
} from '@/api/counselTypes.ts'
import { apiUrl, errorJson } from '@/mocks/http.ts'
import { recommendSchoolViolence } from '@/mocks/schoolViolence/recommendation.ts'
import { findCaseByCounsel } from '@/mocks/schoolViolence/store.ts'
import { findCase, loadDb, nowIso, type StoredCase, updateDb } from './db.ts'
import { DOCUMENT_KINDS, toCaseDocuments } from './documents.ts'

/** 교사 상담 API 목(`/api/teacher/counsel/...`). 제안서 6.6~6.9, 7절(서류) */

const NOT_FOUND_DETAIL = '상담 건을 찾을 수 없어요.'
const NO_DOCUMENTS_DETAIL = '사후 서류가 없는 상담 건이에요.'
const NOT_APPROVABLE_DETAIL = '승인대기 상태의 상담 건만 승인할 수 있어요.'

/** 교사에게 보이는 상담 건만 찾는다. 진행 중인 건은 교사에게 없는 것과 같다(11). */
const findVisible = (stored: StoredCase | undefined) =>
  stored && stored.case.status !== 'in_progress' ? stored : undefined

type Outcome<T> = { body: T } | { status: number; detail: string }

const respond = <T>(outcome: Outcome<T>) =>
  'body' in outcome
    ? HttpResponse.json(outcome.body as Record<string, unknown>)
    : errorJson(outcome.status, outcome.detail)

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

/** 서류가 있는 상담 건의 서류 하나에 fn을 적용한다. 건·서류가 없으면 404. */
function withDocument<T>(
  id: string,
  kind: string,
  fn: (doc: NonNullable<StoredCase['documents']>[number]) => Outcome<T> | undefined,
  toBody: (stored: StoredCase) => T,
): Outcome<T> {
  return updateDb((db) => {
    const stored = findVisible(findCase(db, id))
    if (!stored) return { status: 404, detail: NOT_FOUND_DETAIL }
    const doc = stored.documents?.find((d) => d.kind === kind)
    if (!doc) return { status: 404, detail: NO_DOCUMENTS_DETAIL }
    return fn(doc) ?? { body: toBody(stored) }
  })
}

const documentsBody = (stored: StoredCase): DocumentsResponse => ({
  documents: toCaseDocuments(stored.documents ?? []),
})

const isKind = (kind: string): kind is DocumentKind => DOCUMENT_KINDS.some((k) => k.kind === kind)

export const teacherHandlers = [
  // 6.6 개인상담 관리 목록: 진행 중 건은 빼고 최신순(updated_at 내림차순)
  http.get(apiUrl('/api/teacher/counsel/cases'), () => {
    const cases = loadDb()
      .cases.filter((stored) => findVisible(stored))
      .map((stored) => stored.case)
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    return HttpResponse.json<CaseListResponse>({ cases })
  }),

  // 6.7 상세: 요약·양식·서류. 대화 전문(messages)은 절대 싣지 않는다.
  http.get<PathParams, DefaultBodyType, TeacherCaseDetailResponse | ApiErrorBody>(
    apiUrl('/api/teacher/counsel/cases/:id'),
    ({ params }) => {
      const db = loadDb()
      const stored = findVisible(findCase(db, String(params.id)))
      if (!stored) return errorJson(404, NOT_FOUND_DETAIL)
      return HttpResponse.json<TeacherCaseDetailResponse>({
        case: stored.case,
        summary: stored.summary,
        form: stored.form,
        documents: stored.documents ? toCaseDocuments(stored.documents) : null,
        school_violence_case_id: findCaseByCounsel(db, stored.case.id)?.id ?? null,
        school_violence_recommendation: recommendSchoolViolence(stored.case.detected_keywords),
      })
    },
  ),

  // 6.8 읽음 처리
  http.post(apiUrl('/api/teacher/counsel/cases/:id/read'), ({ params }) =>
    respond(
      updateDb((db): Outcome<CaseResponse> => {
        const stored = findVisible(findCase(db, String(params.id)))
        if (!stored) return { status: 404, detail: NOT_FOUND_DETAIL }
        stored.case.read = true
        return { body: { case: stored.case } }
      }),
    ),
  ),

  // 6.9 상담 승인: awaiting_approval → awaiting_counsel, 그 밖은 409
  http.post(apiUrl('/api/teacher/counsel/cases/:id/approve'), ({ params }) =>
    respond(
      updateDb((db): Outcome<CaseResponse> => {
        const stored = findVisible(findCase(db, String(params.id)))
        if (!stored) return { status: 404, detail: NOT_FOUND_DETAIL }
        if (stored.case.status !== 'awaiting_approval') {
          return { status: 409, detail: NOT_APPROVABLE_DETAIL }
        }
        stored.case.status = 'awaiting_counsel'
        stored.case.updated_at = nowIso()
        return { body: { case: stored.case } }
      }),
    ),
  ),

  // 7절 서류: 선택 바꾸기·초안 본문 수정. 본문을 고치면 승인이 풀린다.
  http.patch(
    apiUrl('/api/teacher/counsel/cases/:id/documents/:kind'),
    async ({ params, request }) => {
      const body = (await readJson(request)) as UpdateDocumentRequest | null
      const hasSelected = typeof body?.selected === 'boolean'
      const hasDraft = typeof body?.draft === 'string'
      if (!hasSelected && !hasDraft) return errorJson(422, '바꿀 내용을 보내 주세요.')
      if (hasDraft && !body?.draft?.trim()) return errorJson(422, '초안 본문을 입력해 주세요.')

      const kind = String(params.kind)
      if (!isKind(kind)) return errorJson(404, NO_DOCUMENTS_DETAIL)
      return respond(
        withDocument(
          String(params.id),
          kind,
          (doc) => {
            if (hasSelected) doc.selected = body?.selected as boolean
            if (hasDraft && body?.draft !== doc.draft) {
              doc.draft = body?.draft as string
              doc.approved = false
            }
            return undefined
          },
          documentsBody,
        ),
      )
    },
  ),

  // 7절 서류: 검토 완료로 승인. 선택한 서류만 승인할 수 있다(그 밖은 409).
  http.post(apiUrl('/api/teacher/counsel/cases/:id/documents/:kind/approve'), ({ params }) => {
    const kind = String(params.kind)
    if (!isKind(kind)) return errorJson(404, NO_DOCUMENTS_DETAIL)
    return respond(
      withDocument(
        String(params.id),
        kind,
        (doc) => {
          if (!doc.selected) {
            return { status: 409, detail: '선택한 서류만 승인할 수 있어요.' }
          }
          doc.approved = true
          return undefined
        },
        documentsBody,
      ),
    )
  }),
]
