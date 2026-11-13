import { Check, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils.ts'

const STEP_INTERVAL_MS = 450

/** 사후 서류 진행 표시의 단계. 실제로는 backend 호출 한 번이고, 단계는 "AI가 무엇을 했는지"를 보이는 장치다. */
const PIPELINE_STEPS = [
  '데이터 수집',
  '요약·분류',
  '서류 선택',
  '초안 생성',
  '검토 대기',
  '승인 완료',
] as const

/** 결과 상태에서 현재 단계의 위치: 모두 승인했으면 「승인 완료」, 아니면 「검토 대기」. */
function finalStepIndex(allApproved: boolean) {
  return allApproved ? PIPELINE_STEPS.length - 1 : PIPELINE_STEPS.length - 2
}

type StepState = 'done' | 'active' | 'pending'

/** `current` 단계까지 진행했을 때 각 단계의 상태. 마지막 단계는 도달하면 완료로 본다. */
function stepStates(current: number): StepState[] {
  const last = PIPELINE_STEPS.length - 1
  return PIPELINE_STEPS.map((_, index) => {
    if (index < current || (index === last && current === last)) return 'done'
    return index === current ? 'active' : 'pending'
  })
}

const SEEN_KEY_PREFIX = 'counsel:documents-seen:'

/** 이 건의 서류 카드를 이미 열어 봤는지. 화면 편의일 뿐이라 저장소를 못 쓰면 매번 처음으로 본다. */
function hasSeenDocuments(caseId: string) {
  try {
    return localStorage.getItem(SEEN_KEY_PREFIX + caseId) === '1'
  } catch {
    return false
  }
}

function markDocumentsSeen(caseId: string) {
  try {
    localStorage.setItem(SEEN_KEY_PREFIX + caseId, '1')
  } catch {
    // 저장소를 못 쓰는 환경이면 다음에도 애니메이션이 한 번 더 돌 뿐이다.
  }
}

/** 데이터 수집 → … → 승인 완료. 이 건을 처음 열 때만 한 번 짧게 움직이고, 다시 열면 바로 결과 상태다. */
export function PipelineProgress({
  caseId,
  allApproved,
}: {
  caseId: string
  allApproved: boolean
}) {
  const target = finalStepIndex(allApproved)
  // 처음 연 건이면 0단계부터 목표까지 차례로 올라간다. 이후에는 곧바로 결과 상태.
  const [animating] = useState(() => !hasSeenDocuments(caseId))
  const [shown, setShown] = useState(animating ? 0 : target)

  // 열자마자 "봤다"고 기록한다. 애니메이션 도중에 나갔다 와도 다시 돌지 않는다.
  useEffect(() => {
    if (animating) markDocumentsSeen(caseId)
  }, [animating, caseId])

  useEffect(() => {
    if (!animating || shown >= target) return
    const timer = setTimeout(() => setShown(shown + 1), STEP_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [animating, shown, target])

  // 애니메이션이 끝난 뒤에는 승인 상태가 바뀌는 대로 목표 단계를 따라간다.
  const current = animating && shown < target ? shown : target
  const states = stepStates(current)

  return (
    <ol aria-label="서류 준비 단계" className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {PIPELINE_STEPS.map((label, index) => (
        <li key={label} className="flex items-center gap-1">
          <StepChip label={label} state={states[index]} spinning={animating && shown < target} />
          {index < PIPELINE_STEPS.length - 1 && <span className="text-border">—</span>}
        </li>
      ))}
    </ol>
  )
}

function StepChip({
  label,
  state,
  spinning,
}: {
  label: string
  state: StepState
  /** 처음 열어 단계가 움직이는 동안만 돈다. 결과 상태의 「검토 대기」는 멈춰 있다. */
  spinning: boolean
}) {
  return (
    <span
      data-state={state}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-300',
        state === 'done' && 'border-success bg-success-soft text-success-strong',
        state === 'active' && 'border-primary bg-primary-soft text-primary',
        state === 'pending' && 'border-border text-muted-foreground',
      )}
    >
      {state === 'done' && <Check className="size-3" />}
      {state === 'active' && <Loader2 className={cn('size-3', spinning && 'animate-spin')} />}
      {label}
    </span>
  )
}
