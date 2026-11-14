import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DemoResetResponse } from '@/api/counselTypes.ts'
import { apiFetch, getBackendConnection } from '@/lib/api.ts'
import { clearParentConversations } from '@/lib/counsel/parentConversations.ts'

/** 「시연 초기화」: 모든 상담 건을 지우고 시드 상태로 되돌린다. 다른 탭은 폴링으로 따라온다. */
export function useResetDemo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const resetServer = getBackendConnection().ready
      try {
        clearParentConversations()
      } catch {
        throw new Error('이 브라우저에 저장된 학부모 대화를 지우지 못했어요.')
      }
      if (!resetServer) return 'parent'
      try {
        await apiFetch<DemoResetResponse>('/api/demo/reset', { method: 'POST' })
        return 'all'
      } catch {
        throw new Error('학부모 대화는 지웠지만 학생·교사 시연을 초기화하지 못했어요.')
      }
    },
    onSuccess: () => queryClient.invalidateQueries(),
  })
}
