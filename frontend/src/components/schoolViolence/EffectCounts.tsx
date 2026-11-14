import { Sparkles } from 'lucide-react'
import type { DocumentCounts } from '@/api/schoolViolenceTypes.ts'
import { cn } from '@/lib/utils.ts'

/**
 * 효과 숫자: 「AI 작성 n칸 / 전체 m칸 · 판단 칸 k개 남음」. 서버가 센 값을 그대로 보인다.
 * 서류 한 장(서류 화면 상단)과 사안 전체 합계(사안 페이지)가 같은 모양을 쓴다.
 */
export function EffectCounts({
  counts,
  className,
}: {
  counts: Pick<DocumentCounts, 'ai' | 'total' | 'judgement_remaining'>
  className?: string
}) {
  return (
    <p
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-ai-soft px-4 py-3',
        className,
      )}
    >
      <Sparkles aria-hidden className="size-5 shrink-0 text-ai" />
      <strong className="text-lg font-semibold text-ai">
        AI 작성 {counts.ai}칸 / 전체 {counts.total}칸
      </strong>
      <span className="text-secondary-foreground">
        · <span className="font-semibold text-judge">판단 칸 {counts.judgement_remaining}개</span>{' '}
        남음
      </span>
    </p>
  )
}

/** 서류 여러 장의 집계를 합친다. 초안이 없는 서류(null)는 건너뛴다. */
export function sumCounts(all: (DocumentCounts | null)[]) {
  return all.reduce(
    (sum, counts) =>
      counts
        ? {
            ai: sum.ai + counts.ai,
            total: sum.total + counts.total,
            judgement_remaining: sum.judgement_remaining + counts.judgement_remaining,
          }
        : sum,
    { ai: 0, total: 0, judgement_remaining: 0 },
  )
}
