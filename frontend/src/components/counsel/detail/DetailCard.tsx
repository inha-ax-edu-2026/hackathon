import type { ReactNode } from 'react'
import { cn } from '@/lib/utils.ts'

type DetailCardProps = {
  title: string
  icon?: ReactNode
  /** 제목 오른쪽 자리 (배지·버튼) */
  aside?: ReactNode
  className?: string
  children: ReactNode
}

/** 상세 화면의 흰 카드: 제목(16px/600) + 내용. 슈퍼스쿨 카드와 같은 모양이다. */
export function DetailCard({ title, icon, aside, className, children }: DetailCardProps) {
  return (
    <section className={cn('rounded-xl border bg-card p-5 shadow-xs', className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-secondary-foreground">
          {icon}
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** 「라벨(회색) | 값」 행 목록. 행 사이에 구분선. */
export function InfoRows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y">
      {rows.map(({ label, value }) => (
        <div key={label} className="grid grid-cols-[8rem_1fr] gap-4 py-3 first:pt-0 last:pb-0">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
