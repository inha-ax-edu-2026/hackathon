import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CaseListResponse,
  CounselCase,
  CounselForm,
  CreateCaseRequest,
  CreateCaseResponse,
  JudgmentResponse,
  SendMessageRequest,
  SendMessageResponse,
  StudentCaseDetailResponse,
} from '@/api/counselTypes.ts'
import { apiFetch } from '@/lib/api.ts'

/** 학생 상담 API 쿼리 훅(제안서 6.1~6.2). 키는 `['studentCounsel', ...]`. */
export const studentCounselKeys = {
  all: ['studentCounsel'] as const,
  list: () => ['studentCounsel', 'cases'] as const,
  detail: (id: string) => ['studentCounsel', 'case', id] as const,
}

/** 내 상담 목록(진행 중 포함, 최신순). */
export function useStudentCases() {
  return useQuery({
    queryKey: studentCounselKeys.list(),
    queryFn: () => apiFetch<CaseListResponse>('/api/student/counsel/cases'),
    // 목록 화면은 들어올 때마다 최신 상태를 본다(다른 탭의 승인 등이 반영된다).
    staleTime: 0,
  })
}

/** 상담 건 다시 열기: 양식·메시지 포함. */
export function useStudentCase(id: string) {
  return useQuery({
    queryKey: studentCounselKeys.detail(id),
    queryFn: () => apiFetch<StudentCaseDetailResponse>(`/api/student/counsel/cases/${id}`),
    // 진행 중이 아니면(전환·종료) 교사 승인 같은 상태 변화를 다른 탭에서 받아 온다.
    refetchInterval: (query) =>
      query.state.data && query.state.data.case.status !== 'in_progress' ? 1500 : false,
  })
}

/** 상담 양식을 제출해 상담 건을 만든다. 응답에 첫 bot 인사가 들어 있다. */
export function useCreateCase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (form: CounselForm) =>
      apiFetch<CreateCaseResponse>('/api/student/counsel/cases', {
        method: 'POST',
        body: { form } satisfies CreateCaseRequest,
      }),
    onSuccess: ({ case: created, messages }, form) => {
      // 챗봇 화면이 같은 상담 건을 다시 요청하지 않고 바로 그리도록 상세 캐시를 채운다.
      queryClient.setQueryData<StudentCaseDetailResponse>(studentCounselKeys.detail(created.id), {
        case: created,
        form,
        messages,
      })
      return queryClient.invalidateQueries({ queryKey: studentCounselKeys.list() })
    },
  })
}

/** 상담 건 상세 캐시를 고친다. 응답을 받은 뒤 다시 요청하지 않고 바로 화면에 반영하려고 쓴다. */
function usePatchDetail(id: string) {
  const queryClient = useQueryClient()
  return (patch: (detail: StudentCaseDetailResponse) => StudentCaseDetailResponse) => {
    queryClient.setQueryData<StudentCaseDetailResponse>(studentCounselKeys.detail(id), (detail) =>
      detail ? patch(detail) : detail,
    )
    return queryClient.invalidateQueries({ queryKey: studentCounselKeys.list() })
  }
}

/**
 * 발화 보내기(제안서 6.3). 같은 `request_id`로 다시 보내면 백엔드가 같은 응답을 돌려주므로
 * 호출하는 쪽은 실패한 글을 다시 보낼 때 같은 `request_id`를 쓴다.
 * 이미 끝난 건(409)이면 상세를 다시 받아 끝난 화면으로 바뀌게 한다.
 */
export function useSendMessage(id: string) {
  const queryClient = useQueryClient()
  const patchDetail = usePatchDetail(id)
  return useMutation({
    mutationFn: (request: SendMessageRequest) =>
      apiFetch<SendMessageResponse>(`/api/student/counsel/cases/${id}/messages`, {
        method: 'POST',
        body: request,
      }),
    onSuccess: ({ student_message, bot_message, case: updated }) =>
      patchDetail((detail) => ({
        ...detail,
        case: updated,
        messages: [...detail.messages, student_message, ...(bot_message ? [bot_message] : [])],
      })),
    onError: () => queryClient.invalidateQueries({ queryKey: studentCounselKeys.detail(id) }),
  })
}

function useCloseCase(id: string, action: 'handoff' | 'finish') {
  const queryClient = useQueryClient()
  const patchDetail = usePatchDetail(id)
  return useMutation({
    mutationFn: () =>
      apiFetch<JudgmentResponse>(`/api/student/counsel/cases/${id}/${action}`, { method: 'POST' }),
    onSuccess: ({ case: updated }: { case: CounselCase }) =>
      patchDetail((detail) => ({ ...detail, case: updated })),
    onError: () => queryClient.invalidateQueries({ queryKey: studentCounselKeys.detail(id) }),
  })
}

/** 「선생님과 상담하기」(6.4): 학생 요청으로 전환한다. */
export function useHandoff(id: string) {
  return useCloseCase(id, 'handoff')
}

/** 「상담 끝내기」(6.5): 전환 없이 끝낸다. */
export function useFinishCase(id: string) {
  return useCloseCase(id, 'finish')
}
