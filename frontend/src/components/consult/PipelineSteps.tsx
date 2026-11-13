import { Check, Loader2 } from 'lucide-react'
import { PIPELINE_STAGES } from '@/lib/consult/model'
import { cn } from '@/lib/utils'

/** 서류 파이프라인 진행 단계 표시. stage는 현재 단계 인덱스(마지막 단계 도달 = 완료). */
export function PipelineSteps({ stage }: { stage: number }) {
  const lastIdx = PIPELINE_STAGES.length - 1
  return (
    <ol className="flex items-center gap-1 text-xs">
      {PIPELINE_STAGES.map((label, i) => {
        const done = i < stage || (i === stage && i === lastIdx)
        const active = i === stage && !done
        return (
          <li key={label} className="flex flex-1 flex-col items-center gap-1 text-center">
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full border',
                done && 'border-emerald-600 bg-emerald-600 text-white',
                active && 'border-sky-600 text-sky-600',
              )}
            >
              {done ? (
                <Check className="size-3.5" />
              ) : active ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                i + 1
              )}
            </span>
            <span className={cn(done || active ? 'font-medium' : 'text-muted-foreground')}>
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
