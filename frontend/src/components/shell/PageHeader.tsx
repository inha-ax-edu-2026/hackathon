import type { ReactNode } from 'react'
import { BackendConnectionButton } from '@/components/counsel/BackendConnection.tsx'
import { cn } from '@/lib/utils.ts'
import { useShell } from './shellContext.ts'

type PageHeaderProps = {
  title: ReactNode
  description?: ReactNode
  /** 제목 위 링크. 예: 「‹ 목록으로 돌아가기」 */
  back?: ReactNode
  /** 오른쪽 주 버튼 자리 */
  actions?: ReactNode
}

/** 셸 페이지의 흰 헤더: 제목(20px/700) · 설명 · 오른쪽 주 버튼 · 고정 신원. */
export function PageHeader({ title, description, back, actions }: PageHeaderProps) {
  const shell = useShell()
  return (
    <header className="border-b bg-background px-8 pt-5 pb-6">
      <div className="mb-3 flex min-h-5 items-center justify-between gap-4 text-sm">
        <div className="text-muted-foreground">{back}</div>
        <div className="flex items-center gap-3">
          {shell && <span className="text-secondary-foreground">{shell.identity}</span>}
          <BackendConnectionButton />
        </div>
      </div>
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}

/** 셸 페이지의 본문 영역. 흰 카드들을 18px 간격으로 쌓는다. */
export function PageBody({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <main className={cn('flex flex-1 flex-col gap-[18px] px-8 py-6', className)}>{children}</main>
  )
}
