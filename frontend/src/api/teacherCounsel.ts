import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CaseListResponse,
  CaseResponse,
  DocumentKind,
  DocumentsResponse,
  TeacherCaseDetailResponse,
  UpdateDocumentRequest,
} from '@/api/counselTypes.ts'
import { ApiError, apiFetch } from '@/lib/api.ts'

/**
 * 교사 상담 API 훅 (`/api/teacher/counsel/...`).
 * query key 규칙: 교사 상담 쿼리는 모두 `['teacherCounsel', ...]`로 시작한다.
 * 쓰기 훅이 `['teacherCounsel']` 접두어를 통째로 무효화하므로, 목록(종 배지 계산 포함)도 따라 갱신된다.
 */

const BASE = '/api/teacher/counsel/cases'

/* ── 목록 (07) ── */

/** 교사 목록 query key. 접두어가 `['teacherCounsel']`이라 쓰기 훅의 무효화로 목록과 종 배지가 따라온다. */
export const teacherCasesKey = ['teacherCounsel', 'cases'] as const

/** 학생 탭의 전환을 교사 탭이 알아차리는 폴링 간격(ms). */
export const TEACHER_CASES_POLL_MS = 1500

/** 「개인상담 관리」 목록. 최신순이고 진행 중인 챗봇 상담 건은 서버가 뺀다. 약 1.5초마다 다시 부른다. */
export function useTeacherCases() {
  return useQuery({
    queryKey: teacherCasesKey,
    queryFn: () => apiFetch<CaseListResponse>(BASE),
    select: (data) => data.cases,
    refetchInterval: TEACHER_CASES_POLL_MS,
    // 학생 탭과 교사 탭을 나란히 띄운 시연에서 가려진 탭도 알림을 받아야 한다.
    refetchIntervalInBackground: true,
    // 기본 staleTime(30초)이면 화면을 옮겨 다닐 때 낡은 목록이 보인다.
    staleTime: 0,
  })
}

/* ── 상세·읽음·승인 (08) ── */

export const teacherCaseDetailKey = (id: string) => ['teacherCounsel', 'detail', id] as const

/** 상담 건 상세: 요약·양식·사후 서류. 대화 전문은 오지 않는다. */
export function useTeacherCaseDetail(id: string) {
  return useQuery({
    queryKey: teacherCaseDetailKey(id),
    queryFn: () => apiFetch<TeacherCaseDetailResponse>(`${BASE}/${id}`),
    // 없는 건(404)은 다시 시도해도 같다.
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
    // 승인·서류 변경이 다른 탭에서 일어나도 따라오게 한다.
    refetchInterval: 5_000,
  })
}

/** 상세를 열면 읽음 처리한다. 목록 쿼리를 무효화해 종 배지가 줄어든다. */
export function useMarkCaseRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<CaseResponse>(`${BASE}/${id}/read`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacherCounsel'] }),
  })
}

/** 「상담 승인」: 승인대기 → 상담대기. 승인대기가 아니면 409. */
export function useApproveCase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<CaseResponse>(`${BASE}/${id}/approve`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacherCounsel'] }),
  })
}

/* ── 사후 서류 (09) ── */

/** 서류 변경 응답(`{documents}`)을 상세 캐시에 바로 반영한다. 사후 서류는 상세 응답에 들어 있다. */
function useApplyDocuments(caseId: string) {
  const queryClient = useQueryClient()
  return {
    // 변경 전에 진행 중인 5초 폴링을 취소해, 늦게 온 옛 응답이 방금 한 변경을 덮지 않게 한다.
    cancelPolling: () => queryClient.cancelQueries({ queryKey: teacherCaseDetailKey(caseId) }),
    apply: ({ documents }: DocumentsResponse) =>
      queryClient.setQueryData<TeacherCaseDetailResponse>(teacherCaseDetailKey(caseId), (old) =>
        old ? { ...old, documents } : old,
      ),
  }
}

/** 서류 선택 바꾸기·초안 본문 수정. 본문을 고치면 그 서류의 승인이 풀린다. */
export function useUpdateDocument(caseId: string) {
  const { cancelPolling, apply } = useApplyDocuments(caseId)
  return useMutation({
    mutationFn: ({ kind, ...body }: { kind: DocumentKind } & UpdateDocumentRequest) =>
      apiFetch<DocumentsResponse>(`${BASE}/${caseId}/documents/${kind}`, { method: 'PATCH', body }),
    onMutate: cancelPolling,
    onSuccess: apply,
  })
}

/** 서류 「검토 완료」. 선택하지 않은 서류는 409. */
export function useApproveDocument(caseId: string) {
  const { cancelPolling, apply } = useApplyDocuments(caseId)
  return useMutation({
    mutationFn: (kind: DocumentKind) =>
      apiFetch<DocumentsResponse>(`${BASE}/${caseId}/documents/${kind}/approve`, {
        method: 'POST',
      }),
    onMutate: cancelPolling,
    onSuccess: apply,
  })
}
