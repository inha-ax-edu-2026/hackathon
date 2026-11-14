import type { SchoolViolenceStage } from '@/api/schoolViolenceTypes.ts'
import { Badge } from '@/components/ui/badge.tsx'
import { STAGE_LABEL } from '@/lib/schoolViolence/labels.ts'

/** 현재 처리 단계(접수·조사·심의) 배지. */
export function StageBadge({ stage }: { stage: SchoolViolenceStage }) {
  return <Badge className="bg-primary-soft text-primary">{STAGE_LABEL[stage]}</Badge>
}
