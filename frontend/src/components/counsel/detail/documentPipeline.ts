/** 사후 서류 진행 표시의 단계. 실제로는 backend 호출 한 번이고, 단계는 "AI가 무엇을 했는지"를 보이는 장치다. */
export const PIPELINE_STEPS = [
  '데이터 수집',
  '요약·분류',
  '서류 선택',
  '초안 생성',
  '검토 대기',
  '승인 완료',
] as const

/** 결과 상태에서 현재 단계의 위치: 모두 승인했으면 「승인 완료」, 아니면 「검토 대기」. */
export function finalStepIndex(allApproved: boolean) {
  return allApproved ? PIPELINE_STEPS.length - 1 : PIPELINE_STEPS.length - 2
}

export type StepState = 'done' | 'active' | 'pending'

/** `current` 단계까지 진행했을 때 각 단계의 상태. 마지막 단계는 도달하면 완료로 본다. */
export function stepStates(current: number): StepState[] {
  const last = PIPELINE_STEPS.length - 1
  return PIPELINE_STEPS.map((_, index) => {
    if (index < current || (index === last && current === last)) return 'done'
    return index === current ? 'active' : 'pending'
  })
}

const SEEN_KEY_PREFIX = 'counsel:documents-seen:'

/** 이 건의 서류 카드를 이미 열어 봤는지. 화면 편의일 뿐이라 저장소를 못 쓰면 매번 처음으로 본다. */
export function hasSeenDocuments(caseId: string) {
  try {
    return localStorage.getItem(SEEN_KEY_PREFIX + caseId) === '1'
  } catch {
    return false
  }
}

export function markDocumentsSeen(caseId: string) {
  try {
    localStorage.setItem(SEEN_KEY_PREFIX + caseId, '1')
  } catch {
    // 저장소를 못 쓰는 환경이면 다음에도 애니메이션이 한 번 더 돌 뿐이다.
  }
}
