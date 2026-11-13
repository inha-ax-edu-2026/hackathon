import type { CaseStatus, Risk } from '@/api/counselTypes.ts'
import { Badge } from '@/components/ui/badge.tsx'
import { CASE_STATUS_LABEL, RISK_LABEL } from '@/lib/counsel/labels.ts'
import { cn } from '@/lib/utils.ts'

/** 상담상태 배지 색. 슈퍼스쿨 목록처럼 흰 배경에 상태색 글자·테두리. 학생·교사 화면 공용. */
const STATUS_TONE: Record<CaseStatus, string> = {
  in_progress: 'border-primary text-primary',
  in_counsel: 'border-primary text-primary',
  awaiting_approval: 'border-warning text-warning-strong',
  awaiting_confirmation: 'border-warning text-warning-strong',
  awaiting_counsel: 'border-info text-info-strong',
  completed: 'border-border text-muted-foreground',
  canceled: 'border-border text-muted-foreground',
}

/** 위험도 배지 색. 낮음·보통·높음을 초록·노랑·빨강 바탕으로. */
const RISK_TONE: Record<Risk, string> = {
  low: 'bg-success-soft text-success-strong',
  medium: 'bg-warning-soft text-warning-strong',
  high: 'bg-destructive-soft text-destructive-strong',
}

/** 상담상태 외곽선 배지 */
export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <Badge variant="outline" className={cn('rounded-md bg-background', STATUS_TONE[status])}>
      {CASE_STATUS_LABEL[status]}
    </Badge>
  )
}

/** 「위험도 높음」 배지 */
export function RiskBadge({ risk }: { risk: Risk }) {
  return <Badge className={RISK_TONE[risk]}>위험도 {RISK_LABEL[risk]}</Badge>
}
