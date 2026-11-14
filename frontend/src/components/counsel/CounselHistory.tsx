import { useNavigate } from 'react-router'
import type { CaseStatus } from '@/api/counselTypes.ts'
import { formatDateTime } from '@/lib/counsel/format.ts'
import { StatusBadge } from './CaseBadges.tsx'

const COLUMNS = ['상담상태', '상담방식', '상담일시', '상담제목', '상담 교사']

type CounselHistoryProps = {
  cases: {
    id: string
    status: CaseStatus
    createdAt: string
    title: string
    to: string
    teacher?: string
  }[]
  isPending?: boolean
  isError?: boolean
}

export function CounselHistory({ cases, isPending, isError }: CounselHistoryProps) {
  const navigate = useNavigate()
  return (
    <section className="overflow-x-auto rounded-[14px] border bg-card">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead>
          <tr className="h-12 border-b text-muted-foreground">
            {COLUMNS.map((name) => (
              <th key={name} className="px-6 font-medium">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => {
            const open = () => navigate(c.to)
            return (
              <tr key={c.id} onClick={open} className="cursor-pointer border-b hover:bg-accent/60">
                <td className="px-6 py-4">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-6 py-4">AI 챗봇</td>
                <td className="px-6 py-4">{formatDateTime(c.createdAt)}</td>
                <td className="px-6 py-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      open()
                    }}
                    className="text-left font-medium hover:underline"
                  >
                    {c.title}
                  </button>
                </td>
                <td className="px-6 py-4">{c.teacher ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {(isPending || isError || cases.length === 0) && (
        <p className="px-6 py-16 text-center text-muted-foreground">
          {isPending
            ? '불러오는 중이에요.'
            : isError
              ? '상담 목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.'
              : '아직 학폭 상담이 없어요. 「상담하기」로 시작해 보세요.'}
        </p>
      )}
      {!isPending && (
        <p className="border-t px-6 py-3 text-sm text-muted-foreground">총 {cases.length}건</p>
      )}
    </section>
  )
}
