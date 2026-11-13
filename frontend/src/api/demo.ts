import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DemoResetResponse } from '@/api/counselTypes.ts'
import { apiFetch } from '@/lib/api.ts'

/** 「시연 초기화」: 모든 상담 건을 지우고 시드 상태로 되돌린다. 다른 탭은 폴링으로 따라온다. */
export function useResetDemo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch<DemoResetResponse>('/api/demo/reset', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries(),
  })
}
