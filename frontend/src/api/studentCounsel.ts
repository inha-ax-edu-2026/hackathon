import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CaseListResponse,
  CounselForm,
  CreateCaseRequest,
  CreateCaseResponse,
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
