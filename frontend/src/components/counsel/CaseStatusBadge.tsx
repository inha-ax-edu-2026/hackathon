import type { CaseStatus } from '@/api/counselTypes.ts'
import { Badge } from '@/components/ui/badge.tsx'
import { CASE_STATUS_LABEL } from '@/lib/counsel/labels.ts'
import { cn } from '@/lib/utils.ts'

/** 슈퍼스쿨 목록의 외곽선 상태 배지(흰 배경 + 상태색 글자·테두리). */
const TONE: Record<CaseStatus, string> = {
  in_progress: 'border-primary text-primary',
  in_counsel: 'border-primary text-primary',
  awaiting_approval: 'border-warning-strong text-warning-strong',
  awaiting_confirmation: 'border-warning-strong text-warning-strong',
  awaiting_counsel: 'border-success-strong text-success-strong',
  completed: 'border-border text-muted-foreground',
  canceled: 'border-border text-muted-foreground',
}

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return (
    <Badge variant="outline" className={cn('rounded-lg bg-background', TONE[status])}>
      {CASE_STATUS_LABEL[status]}
    </Badge>
  )
}
