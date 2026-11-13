import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import type { CounselCase } from '@/api/counselTypes.ts'
import { RISK_LABEL } from '@/lib/counsel/labels.ts'
import { takeNewHandoffs } from '@/lib/counsel/notifications.ts'
import { maskName } from '@/lib/counsel/teacherView.ts'

export const counselDetailPath = (id: string) => `/teacher/manage-apply/counsel/${id}`

/**
 * 폴링으로 받은 목록에 새 전환 건이 생기면 토스트를 한 번 띄운다.
 * 처음 불러온 목록에 이미 있던 건은 종 배지로만 알린다.
 */
export function useHandoffToasts(cases: CounselCase[] | undefined) {
  const navigate = useNavigate()
  const seen = useRef<ReadonlySet<string> | null>(null)

  useEffect(() => {
    if (!cases) return
    const result = takeNewHandoffs(seen.current, cases)
    seen.current = result.seen
    for (const c of result.fresh) {
      const risk = c.risk ? ` · 위험도 ${RISK_LABEL[c.risk]}` : ''
      toast(`${maskName(c.student.name)} 학생이 개인상담으로 전환됐어요${risk}`, {
        id: c.id,
        duration: 10_000,
        action: { label: '상세 보기', onClick: () => navigate(counselDetailPath(c.id)) },
      })
    }
  }, [cases, navigate])
}
