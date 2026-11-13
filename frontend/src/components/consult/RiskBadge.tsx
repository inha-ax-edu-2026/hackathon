import { Badge } from '@/components/ui/badge'
import { RISK_LABEL, type Risk } from '@/lib/consult/model'
import { cn } from '@/lib/utils'

const RISK_CLASS: Record<Risk, string> = {
  low: 'bg-success-soft text-success-strong',
  medium: 'bg-warning-soft text-warning-strong',
  high: 'bg-destructive-soft text-destructive-strong',
}

export function RiskBadge({ risk }: { risk: Risk }) {
  return (
    <Badge className={cn('border-transparent', RISK_CLASS[risk])}>위험도 {RISK_LABEL[risk]}</Badge>
  )
}
