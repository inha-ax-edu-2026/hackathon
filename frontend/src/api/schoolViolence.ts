import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ApproveDocumentRequest,
  DocumentGenerationJob,
  DocumentGenerationJobResponse,
  GenerateDocumentDraftRequest,
  IntakeSchoolViolenceCaseRequest,
  SaveDocumentFieldEdit,
  SaveDocumentRequest,
  SchoolViolenceCaseListResponse,
  SchoolViolenceCaseResponse,
  SchoolViolenceDocumentResponse,
  UpdateSchoolViolenceInfoRequest,
} from '@/api/schoolViolenceTypes.ts'
import { ApiError, apiFetch } from '@/lib/api.ts'
import { fetchTeacherCaseDetail } from './teacherCounsel.ts'

/**
 * 교사 학교폭력 사안 API 훅 (`/api/teacher/school-violence/...`, 제안 계약).
 * query key 규칙: 사안 쿼리는 모두 `['schoolViolence', ...]`로 시작한다.
 * 쓰기 훅은 `['schoolViolence']` 접두어를 통째로 무효화하므로 목록·상세가 함께 갱신된다.
 */

const BASE = '/api/teacher/school-violence/cases'

/** 서류 작업실 열기. 이미 연결한 사안은 재사용하며 모의 API로 대체하지 않는다. */
export async function openSchoolViolenceWorkspace(counselCaseId: string) {
  const detail = await fetchTeacherCaseDetail(counselCaseId)
  if (detail.school_violence_case_id) {
    return apiFetch<SchoolViolenceCaseResponse>(`${BASE}/${detail.school_violence_case_id}`)
  }
  try {
    return await apiFetch<SchoolViolenceCaseResponse>(BASE, {
      method: 'POST',
      body: { counsel_case_id: counselCaseId } satisfies IntakeSchoolViolenceCaseRequest,
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      const latest = await fetchTeacherCaseDetail(counselCaseId)
      if (latest.school_violence_case_id) {
        return apiFetch<SchoolViolenceCaseResponse>(`${BASE}/${latest.school_violence_case_id}`)
      }
    }
    if (error instanceof ApiError && error.status === 404) {
      throw new ApiError(503, {
        detail: '서류 작업실 연동을 적용하려면 백엔드 서버를 최신 코드로 재시작해 주세요.',
      })
    }
    throw error
  }
}

/** 사안 목록 query key */
export const schoolViolenceCasesKey = ['schoolViolence', 'cases'] as const

/** 사안 목록. 최근에 접수한 사안이 먼저 온다. */
export function useSchoolViolenceCases() {
  return useQuery({
    queryKey: schoolViolenceCasesKey,
    queryFn: () => apiFetch<SchoolViolenceCaseListResponse>(BASE),
    select: (data) => data.cases,
    // 시연 초기화·다른 탭의 접수가 목록에 바로 보이게 한다.
    staleTime: 0,
  })
}

export const schoolViolenceCaseKey = (id: string) => ['schoolViolence', 'case', id] as const

/** 사안 상세: 사안 정보·사안 자료(원문 포함)·서류 9종 요약. */
export function useSchoolViolenceCase(id: string) {
  return useQuery({
    queryKey: schoolViolenceCaseKey(id),
    queryFn: () => apiFetch<SchoolViolenceCaseResponse>(`${BASE}/${id}`),
    select: (data) => data.case,
    // 없는 사안(404)은 다시 시도해도 같다.
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
  })
}

/**
 * 「학폭 사안으로 접수」: 상담 건에서 사안을 만든다. 이미 접수한 상담 건이면 409.
 * 상담 상세의 연결 사안 ID가 바뀌므로 상담 쿼리도 함께 무효화한다.
 */
export function useIntakeSchoolViolenceCase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (counselCaseId: string) =>
      apiFetch<SchoolViolenceCaseResponse>(BASE, {
        method: 'POST',
        body: { counsel_case_id: counselCaseId } satisfies IntakeSchoolViolenceCaseRequest,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(schoolViolenceCaseKey(data.case.id), data)
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['schoolViolence', 'cases'] }),
        queryClient.invalidateQueries({ queryKey: ['teacherCounsel'] }),
      ])
    },
  })
}

/** 상담 건에 연결된 사안 ID. 실제 서버와 명시적 모의 모드 모두 같은 계약을 사용한다. */
export function useLinkedSchoolViolenceCaseId(counselCaseId: string, enabled: boolean) {
  const { data } = useQuery({
    queryKey: schoolViolenceCasesKey,
    queryFn: () => apiFetch<SchoolViolenceCaseListResponse>(BASE),
    select: (res) => res.cases.find((c) => c.counsel_case_ids?.includes(counselCaseId))?.id ?? null,
    enabled,
  })
  return data ?? null
}

export const schoolViolenceDocumentKey = (caseId: string, formId: string) =>
  ['schoolViolence', 'case', caseId, 'document', formId] as const

/** 서류 상세: 칸 목록·근거 인용·검토 상태. 초안이 없으면 칸이 비어 있다. */
export function useSchoolViolenceDocument(caseId: string, formId: string) {
  return useQuery({
    queryKey: schoolViolenceDocumentKey(caseId, formId),
    queryFn: () =>
      apiFetch<SchoolViolenceDocumentResponse>(`${BASE}/${caseId}/documents/${formId}`),
    select: (data) => data.document,
    refetchInterval: (query) =>
      query.state.data?.document.generation_job?.status === 'running' ? 1500 : false,
    refetchIntervalInBackground: true,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
  })
}

/** AI 생성 중에는 긴 HTTP 연결 대신 짧은 상태 조회를 이어 간다. */
export async function generateSchoolViolenceDraft(
  caseId: string,
  formId: string,
  request: GenerateDocumentDraftRequest = {},
  onQueued?: (job: DocumentGenerationJob) => void,
): Promise<SchoolViolenceDocumentResponse> {
  const path = `${BASE}/${caseId}/documents/${formId}`
  let accepted: SchoolViolenceDocumentResponse | DocumentGenerationJobResponse
  try {
    accepted = await apiFetch(`${path}/draft`, {
      method: 'POST',
      body: { ...request, async_generation: true },
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) {
      const detail = (error.body as { detail?: { loc?: unknown[] }[] } | null)?.detail
      if (Array.isArray(detail) && detail.some((item) => item.loc?.includes('async_generation'))) {
        throw new ApiError(503, {
          detail: '초안 생성 개선을 적용하려면 백엔드 서버를 최신 코드로 재시작해 주세요.',
        })
      }
    }
    throw error
  }
  // 명시적 모의 모드와 이미 저장한 결과는 바로 반환한다.
  if (!accepted || typeof accepted !== 'object')
    throw new ApiError(502, { detail: '초안 생성 작업 정보를 받지 못했어요.' })
  if ('document' in accepted && accepted.document) return { document: accepted.document }
  if (!('job' in accepted))
    throw new ApiError(502, { detail: '초안 생성 작업 정보를 받지 못했어요.' })
  onQueued?.(accepted.job)
  const jobPath = `${path}/jobs/${encodeURIComponent(accepted.job.id)}`
  const deadline = Date.now() + 10 * 60_000
  while (Date.now() < deadline) {
    let result: DocumentGenerationJobResponse
    try {
      result = await apiFetch(jobPath)
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) {
        throw new ApiError(0, {
          detail:
            '진행 상태를 확인하지 못했어요. 서버의 생성은 계속되며 결과는 자동 저장됩니다. 화면을 다시 열어 확인해 주세요.',
        })
      }
      throw error
    }
    if (!result?.job || result.job.id !== accepted.job.id)
      throw new ApiError(502, { detail: '초안 생성 작업 상태가 올바르지 않아요.' })
    if (result.job.status === 'failed') {
      throw new ApiError(result.job.error?.status ?? 502, {
        detail: result.job.error?.detail ?? '초안 생성에 실패했어요. 저장된 초안은 유지됩니다.',
      })
    }
    if (result.job.status === 'completed') {
      if (result.document) return { document: result.document }
      throw new ApiError(502, {
        detail: '완료된 초안을 받지 못했어요. 화면을 다시 열어 확인해 주세요.',
      })
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new ApiError(504, {
    detail: '생성이 계속 진행 중입니다. 결과는 자동 저장되니 화면을 다시 열어 확인해 주세요.',
  })
}

/**
 * 「AI 초안 만들기」. 응답의 서류가 상세 캐시를 바로 채우고, 사안 목록·상세(서류 상태·진행률)는 다시 불러온다.
 * 이미 초안이 있는 서류를 다시 만들 때는 `overwrite_confirmed: true`가 있어야 한다(티켓 04).
 */
export function useGenerateDocumentDraft(caseId: string, formId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: GenerateDocumentDraftRequest = {}) =>
      generateSchoolViolenceDraft(caseId, formId, request, (job) => {
        queryClient.setQueryData<SchoolViolenceDocumentResponse>(
          schoolViolenceDocumentKey(caseId, formId),
          (old) => (old ? { document: { ...old.document, generation_job: job } } : old),
        )
      }),
    onError: () =>
      queryClient.invalidateQueries({ queryKey: schoolViolenceDocumentKey(caseId, formId) }),
    onSuccess: (data) => {
      queryClient.setQueryData(schoolViolenceDocumentKey(caseId, formId), data)
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: schoolViolenceCaseKey(caseId), exact: true }),
        queryClient.invalidateQueries({ queryKey: schoolViolenceCasesKey }),
      ])
    },
  })
}

/**
 * 서류 저장(칸 수정·검토 표시). 개정 번호는 실행하는 순간 캐시의 최신 서류에서 읽는다 — 연달아 누른 저장이
 * 같은 번호를 보내 서로 409가 되지 않도록 뮤테이션을 한 줄로 세운다. 다른 창에서 먼저 고쳤다면 409다.
 * 응답이 서류 캐시를 채우고, 사안의 서류 요약·집계(체크리스트)는 다시 불러온다.
 */
export function useSaveDocument(caseId: string, formId: string) {
  const queryClient = useQueryClient()
  const documentKey = schoolViolenceDocumentKey(caseId, formId)
  return useMutation({
    scope: { id: documentKey.join(':') },
    mutationFn: (fields: SaveDocumentFieldEdit[]) => {
      const cached = queryClient.getQueryData<SchoolViolenceDocumentResponse>(documentKey)
      return apiFetch<SchoolViolenceDocumentResponse>(
        `${BASE}/${caseId}/documents/${formId}/save`,
        {
          method: 'POST',
          body: { revision: cached?.document.revision ?? 0, fields } satisfies SaveDocumentRequest,
        },
      )
    },
    onSuccess: (data) => {
      queryClient.setQueryData(documentKey, data)
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: schoolViolenceCaseKey(caseId), exact: true }),
        queryClient.invalidateQueries({ queryKey: schoolViolenceCasesKey }),
      ])
    },
    // 오래된 개정이면(409) 최신 서류를 다시 받아 화면이 따라가게 한다.
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        return queryClient.invalidateQueries({ queryKey: documentKey })
      }
    },
  })
}

/** 서류 승인. 사안의 단계·진행률·체크리스트가 바뀌므로 `['schoolViolence']` 쿼리를 통째로 무효화한다. */
export function useApproveDocument(caseId: string, formId: string) {
  const queryClient = useQueryClient()
  const documentKey = schoolViolenceDocumentKey(caseId, formId)
  return useMutation({
    scope: { id: documentKey.join(':') },
    mutationFn: () => {
      const cached = queryClient.getQueryData<SchoolViolenceDocumentResponse>(documentKey)
      return apiFetch<SchoolViolenceDocumentResponse>(
        `${BASE}/${caseId}/documents/${formId}/approve`,
        {
          method: 'POST',
          body: { revision: cached?.document.revision ?? 0 } satisfies ApproveDocumentRequest,
        },
      )
    },
    onSuccess: (data) => {
      queryClient.setQueryData(documentKey, data)
      return queryClient.invalidateQueries({ queryKey: ['schoolViolence'] })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        return queryClient.invalidateQueries({ queryKey: documentKey })
      }
    },
  })
}

/**
 * 사안 정보 수정. 서류의 사안 정보 칸은 서버가 읽을 때 사안 정보에서 가져오므로,
 * 응답의 사안으로 상세 캐시를 바로 채우고 서류·목록 쿼리는 모두 다시 불러온다.
 */
export function useUpdateSchoolViolenceInfo(caseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpdateSchoolViolenceInfoRequest) =>
      apiFetch<SchoolViolenceCaseResponse>(`${BASE}/${caseId}/info`, {
        method: 'PATCH',
        body: request,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(schoolViolenceCaseKey(caseId), data)
      return queryClient.invalidateQueries({ queryKey: ['schoolViolence'] })
    },
  })
}
