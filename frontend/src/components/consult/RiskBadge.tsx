import { Badge } from '@/components/ui/badge'
import { RISK_LABEL, type Risk } from '@/lib/consult/model'
import { cn } from '@/lib/utils'

const RISK_CLASS: Record<Risk, string> = {
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-red-100 text-red-800',
}

export function RiskBadge({ risk }: { risk: Risk }) {
  return (
    <Badge className={cn('border-transparent', RISK_CLASS[risk])}>위험도 {RISK_LABEL[risk]}</Badge>
  )
}
