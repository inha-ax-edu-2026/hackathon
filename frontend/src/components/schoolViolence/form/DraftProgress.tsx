import { Check, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils.ts'

/** 단계 하나가 지나가는 시간. 단계 수와 곱한 값이 진행 표시가 보이는 최소 시간이다. */
export const DRAFT_STEP_MS = 550

/** AI가 초안을 쓰는 동안 하는 일. 실제 요청은 한 번이고, 단계는 무엇을 하는지 보이는 장치다. */
const STEPS = [
  '사안 자료 읽는 중',
  '사실관계 정리 중',
  '양식 칸에 배치 중',
  '근거 인용 확인 중',
] as const

export const DRAFT_MIN_MS = STEPS.length * DRAFT_STEP_MS

/** 「AI 초안 만들기」를 누른 뒤 양식이 채워지기 전까지 보이는 진행 표시. */
export function DraftProgress({ formName }: { formName: string }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (step >= STEPS.length - 1) return
    const timer = setTimeout(() => setStep(step + 1), DRAFT_STEP_MS)
    return () => clearTimeout(timer)
  }, [step])

  return (
    <section
      aria-live="polite"
      className="flex flex-col items-center gap-5 rounded-xl border bg-card px-6 py-16 shadow-xs"
    >
      <Loader2 aria-hidden className="size-8 animate-spin text-ai" />
      <p className="text-base font-semibold">{formName} 초안을 만들고 있어요</p>
      <ol className="flex flex-wrap items-center justify-center gap-2">
        {STEPS.map((label, index) => {
          const state = index < step ? 'done' : index === step ? 'active' : 'pending'
          return (
            <li
              key={label}
              data-state={state}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-300',
                state === 'done' && 'border-ai bg-ai-soft text-ai',
                state === 'active' && 'border-ai text-ai',
                state === 'pending' && 'text-muted-foreground',
              )}
            >
              {state === 'done' && <Check className="size-3" />}
              {state === 'active' && <Loader2 className="size-3 animate-spin" />}
              {label}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
