import type { CaseStatus, Risk } from '@/api/counselTypes.ts'
import { Badge } from '@/components/ui/badge.tsx'
import { CASE_STATUS_LABEL, RISK_LABEL } from '@/lib/counsel/labels.ts'
import { cn } from '@/lib/utils.ts'

const RISK_CLASS: Record<Risk, string> = {
  low: 'bg-success-soft text-success-strong',
  medium: 'bg-warning-soft text-warning-strong',
  high: 'bg-destructive-soft text-destructive-strong',
}

/** 「위험도 높음」 배지 */
export function RiskBadge({ risk }: { risk: Risk }) {
  return <Badge className={RISK_CLASS[risk]}>위험도 {RISK_LABEL[risk]}</Badge>
}

const STATUS_CLASS: Partial<Record<CaseStatus, string>> = {
  awaiting_approval: 'border-warning text-warning-strong',
  awaiting_counsel: 'border-success text-success-strong',
  completed: 'border-border text-secondary-foreground',
}

/** 상담상태 외곽선 배지 */
export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn('bg-background', STATUS_CLASS[status] ?? 'border-info text-info')}
    >
      {CASE_STATUS_LABEL[status]}
    </Badge>
  )
}
