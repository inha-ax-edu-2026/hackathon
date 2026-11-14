import { type DefaultBodyType, delay, HttpResponse, http, type PathParams } from 'msw'
import type { ApiErrorBody } from '@/api/counselTypes.ts'
import type {
  ApproveDocumentRequest,
  IntakeSchoolViolenceCaseRequest,
  SaveDocumentRequest,
  SchoolViolenceCaseListResponse,
  SchoolViolenceCaseResponse,
  SchoolViolenceDocumentResponse,
} from '@/api/schoolViolenceTypes.ts'
import { findCase, loadDb, newId, nowIso, updateDb } from '@/mocks/counsel/db.ts'
import { apiUrl, errorJson } from '@/mocks/http.ts'
import { createDocuments } from './documentCatalog.ts'
import { toDocument } from './documents.ts'
import { DRAFT_BUILDERS, draftLockReason } from './drafts/index.ts'
import { applyEdits, unreviewedAiFields, validateEdits } from './edit.ts'
import { parseInfoPatch, syncDocumentStudents, syncOffenderFields } from './infoUpdate.ts'
import { createMaterials, DEMO_MATERIAL_KINDS } from './materials.ts'
import { createInfo } from './seed.ts'
import { findCaseByCounsel, findSchoolViolenceCase, toCase, toListItem } from './store.ts'

/** 교사 학교폭력 사안 API 목(`/api/teacher/school-violence/...`). 제안 계약(ADR 0002). */

const NOT_FOUND_DETAIL = '사안을 찾을 수 없어요.'
const COUNSEL_NOT_FOUND_DETAIL = '상담 건을 찾을 수 없어요.'
const DOCUMENT_NOT_FOUND_DETAIL = '서류를 찾을 수 없어요.'
const OUT_OF_DEMO_DETAIL = '이번 시연 범위 밖의 서류예요.'
const NO_DRAFT_BUILDER_DETAIL = '이 서류의 초안은 아직 만들 수 없어요.'
const STALE_REVISION_DETAIL = '다른 창에서 수정되었어요. 다시 열어 최신 내용을 확인해 주세요.'
const NO_DRAFT_DETAIL = '아직 초안이 없는 서류예요. 먼저 AI 초안을 만들어 주세요.'
const OVERWRITE_DETAIL =
  '이미 만든 초안이 있어요. 다시 만들면 고친 내용이 지워지니, 덮어쓰기를 확인한 뒤 요청해 주세요.'
const ALREADY_INTAKE_DETAIL = '이미 사안으로 접수한 상담 건이에요.'

/** 사안번호는 접수할 때 자동으로 붙는다. 예시 사안(2026-27호)부터 접수 순서대로 센다. */
const FIRST_CASE_SEQUENCE = 27

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

export const schoolViolenceHandlers = [
  // 사안 목록: 최근에 접수한 사안이 먼저
  http.get(apiUrl('/api/teacher/school-violence/cases'), () => {
    const cases = [...loadDb().schoolViolenceCases]
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .map(toListItem)
    return HttpResponse.json<SchoolViolenceCaseListResponse>({ cases })
  }),

  // 사안 상세: 사안 정보·사안 자료(원문 포함)·서류 9종 요약
  http.get<PathParams, DefaultBodyType, SchoolViolenceCaseResponse | ApiErrorBody>(
    apiUrl('/api/teacher/school-violence/cases/:id'),
    ({ params }) => {
      const stored = findSchoolViolenceCase(loadDb(), String(params.id))
      if (!stored) return errorJson(404, NOT_FOUND_DETAIL)
      return HttpResponse.json<SchoolViolenceCaseResponse>({ case: toCase(stored) })
    },
  ),

  // 상담 건에서 사안 접수. 이미 연결된 상담 건이면 409.
  http.post<PathParams, DefaultBodyType, SchoolViolenceCaseResponse | ApiErrorBody>(
    apiUrl('/api/teacher/school-violence/cases'),
    async ({ request }) => {
      const body = (await readJson(request)) as Partial<IntakeSchoolViolenceCaseRequest> | null
      const counselCaseId = body?.counsel_case_id
      if (typeof counselCaseId !== 'string' || counselCaseId === '') {
        return errorJson(422, '접수할 상담 건을 보내 주세요.')
      }
      const demoKinds = body?.demo_material_kinds ?? DEMO_MATERIAL_KINDS
      if (
        !Array.isArray(demoKinds) ||
        demoKinds.some((kind) => !DEMO_MATERIAL_KINDS.includes(kind))
      ) {
        return errorJson(422, '미리 붙일 조사 자료 종류를 확인해 주세요.')
      }
      return updateDb((db) => {
        const counsel = findCase(db, counselCaseId)
        if (!body?.external_counsel && (!counsel || counsel.case.status === 'in_progress')) {
          return errorJson(404, COUNSEL_NOT_FOUND_DETAIL)
        }
        if (findCaseByCounsel(db, counselCaseId)) return errorJson(409, ALREADY_INTAKE_DETAIL)

        const at = nowIso()
        const sequence = FIRST_CASE_SEQUENCE + db.schoolViolenceCases.length
        const stored = {
          id: newId('sv'),
          info: createInfo(at, `2026-${sequence}`),
          materials: createMaterials(counselCaseId, demoKinds),
          documents: createDocuments(),
          counsel_case_ids: [counselCaseId],
          created_at: at,
        }
        db.schoolViolenceCases.push(stored)
        return HttpResponse.json<SchoolViolenceCaseResponse>(
          { case: toCase(stored) },
          { status: 201 },
        )
      })
    },
  ),

  // 사안 정보 수정. 서류의 사안 정보 칸은 읽을 때 사안 정보에서 가져오므로 따로 고칠 서류 값은 없고,
  // 가해 관련 학생이 바뀌면 이미 만든 서류의 학생별 칸만 맞춘다.
  http.patch<PathParams, DefaultBodyType, SchoolViolenceCaseResponse | ApiErrorBody>(
    apiUrl('/api/teacher/school-violence/cases/:id/info'),
    async ({ params, request }) => {
      const parsed = parseInfoPatch(await readJson(request))
      if ('error' in parsed) return errorJson(422, parsed.error)
      return updateDb((db) => {
        const stored = findSchoolViolenceCase(db, String(params.id))
        if (!stored) return errorJson(404, NOT_FOUND_DETAIL)
        stored.info = { ...stored.info, ...parsed.patch }
        if (parsed.patch.students) {
          for (const doc of stored.documents) syncDocumentStudents(doc, parsed.patch.students)
        }
        return HttpResponse.json<SchoolViolenceCaseResponse>({ case: toCase(stored) })
      })
    },
  ),

  // 서류 상세: 칸 목록·인용·검토 상태. 초안이 없으면 칸이 비어 있다.
  http.get<PathParams, DefaultBodyType, SchoolViolenceDocumentResponse | ApiErrorBody>(
    apiUrl('/api/teacher/school-violence/cases/:id/documents/:formId'),
    ({ params }) => {
      const stored = findSchoolViolenceCase(loadDb(), String(params.id))
      if (!stored) return errorJson(404, NOT_FOUND_DETAIL)
      const doc = stored.documents.find((d) => d.form_id === params.formId)
      if (!doc) return errorJson(404, DOCUMENT_NOT_FOUND_DETAIL)
      return HttpResponse.json<SchoolViolenceDocumentResponse>({
        document: toDocument(doc, stored.info, stored.materials),
      })
    },
  ),

  // AI 초안 만들기. 초안이 이미 있는데 overwrite_confirmed 확인이 없으면 409.
  http.post<PathParams, DefaultBodyType, SchoolViolenceDocumentResponse | ApiErrorBody>(
    apiUrl('/api/teacher/school-violence/cases/:id/documents/:formId/draft'),
    async ({ params, request }) => {
      const body = (await readJson(request)) as { overwrite_confirmed?: unknown } | null
      const before = findSchoolViolenceCase(loadDb(), String(params.id))
      if (!before) return errorJson(404, NOT_FOUND_DETAIL)
      const found = before.documents.find((d) => d.form_id === params.formId)
      if (!found) return errorJson(404, DOCUMENT_NOT_FOUND_DETAIL)
      if (!found.available) return errorJson(409, OUT_OF_DEMO_DETAIL)
      const build = DRAFT_BUILDERS[found.form_id]
      if (!build) return errorJson(409, NO_DRAFT_BUILDER_DETAIL)
      // 근거 없는 초안을 만들지 않도록, 필요한 사안 자료가 없으면 거절한다.
      const lockReason = draftLockReason(found.form_id, before.materials)
      if (lockReason) return errorJson(409, lockReason)
      if (found.status !== 'none' && body?.overwrite_confirmed !== true) {
        return errorJson(409, OVERWRITE_DETAIL)
      }

      // 초안을 쓰는 데 걸리는 시간을 흉내 낸다.
      await delay()

      return updateDb((db) => {
        const stored = findSchoolViolenceCase(db, String(params.id))
        const doc = stored?.documents.find((d) => d.form_id === params.formId)
        if (!stored || !doc) return errorJson(404, NOT_FOUND_DETAIL)
        doc.revision = doc.fields.length === 0 ? doc.revision : doc.revision + 1
        // 가해 관련 학생별 칸은 시드 학생 기준이라, 지금의 관련 학생 명단에 맞춘다.
        doc.fields = syncOffenderFields(
          build({ materials: stored.materials }),
          stored.info.students,
        )
        doc.status = 'reviewing'
        return HttpResponse.json<SchoolViolenceDocumentResponse>(
          { document: toDocument(doc, stored.info, stored.materials) },
          { status: 201 },
        )
      })
    },
  ),

  // 서류 저장: 바꾼 칸의 값·검토 표시. 요청 revision이 오래됐으면 409, 잘못된 수정이면 422.
  http.post<PathParams, DefaultBodyType, SchoolViolenceDocumentResponse | ApiErrorBody>(
    apiUrl('/api/teacher/school-violence/cases/:id/documents/:formId/save'),
    async ({ params, request }) => {
      const body = (await readJson(request)) as Partial<SaveDocumentRequest> | null
      return updateDb((db) => {
        const stored = findSchoolViolenceCase(db, String(params.id))
        if (!stored) return errorJson(404, NOT_FOUND_DETAIL)
        const doc = stored.documents.find((d) => d.form_id === params.formId)
        if (!doc) return errorJson(404, DOCUMENT_NOT_FOUND_DETAIL)
        if (doc.status === 'none') return errorJson(409, NO_DRAFT_DETAIL)
        if (typeof body?.revision !== 'number') return errorJson(422, '개정 번호를 보내 주세요.')
        if (body.revision !== doc.revision) return errorJson(409, STALE_REVISION_DETAIL)
        const invalid = validateEdits(doc, body.fields)
        if (invalid) return errorJson(invalid.status, invalid.detail)

        applyEdits(doc, body.fields as NonNullable<SaveDocumentRequest['fields']>)
        return HttpResponse.json<SchoolViolenceDocumentResponse>({
          document: toDocument(doc, stored.info, stored.materials),
        })
      })
    },
  ),

  // 서류 승인: AI 칸이 모두 검토됐을 때만. 판단 칸은 비어 있어도 된다. 결재·제출이 아니다.
  http.post<PathParams, DefaultBodyType, SchoolViolenceDocumentResponse | ApiErrorBody>(
    apiUrl('/api/teacher/school-violence/cases/:id/documents/:formId/approve'),
    async ({ params, request }) => {
      const body = (await readJson(request)) as Partial<ApproveDocumentRequest> | null
      return updateDb((db) => {
        const stored = findSchoolViolenceCase(db, String(params.id))
        if (!stored) return errorJson(404, NOT_FOUND_DETAIL)
        const doc = stored.documents.find((d) => d.form_id === params.formId)
        if (!doc) return errorJson(404, DOCUMENT_NOT_FOUND_DETAIL)
        if (doc.status === 'none') return errorJson(409, NO_DRAFT_DETAIL)
        if (typeof body?.revision !== 'number') return errorJson(422, '개정 번호를 보내 주세요.')
        if (body.revision !== doc.revision) return errorJson(409, STALE_REVISION_DETAIL)
        const remaining = unreviewedAiFields(doc)
        if (remaining.length > 0) {
          return errorJson(409, `검토하지 않은 AI 칸이 ${remaining.length}개 남아 있어요.`)
        }

        doc.status = 'approved'
        return HttpResponse.json<SchoolViolenceDocumentResponse>({
          document: toDocument(doc, stored.info, stored.materials),
        })
      })
    },
  ),
]
