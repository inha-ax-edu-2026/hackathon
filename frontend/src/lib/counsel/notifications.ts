import type { CounselCase } from '@/api/counselTypes.ts'

/**
 * 교사 알림 = 전환됐고(handoff != null) 아직 읽지 않은(read == false) 상담 건.
 * 별도 알림 API 없이 목록 응답에서 계산한다. 전환 시각이 최신인 건이 앞에 온다.
 */
export function unreadHandoffs(cases: readonly CounselCase[]): CounselCase[] {
  return cases
    .filter((c) => c.handoff !== null && !c.read)
    .sort((a, b) => Date.parse(b.handoff?.at ?? '') - Date.parse(a.handoff?.at ?? ''))
}

/**
 * 폴링 결과에서 토스트를 띄울 새 전환 건을 가려낸다.
 * `seen`은 지금까지 본 전환 건 id 집합이고 처음에는 null이다. 첫 목록에 이미 있던 전환 건은
 * 종 배지로만 알리고 토스트는 띄우지 않는다. 돌려받은 `seen`을 다음 호출에 넘긴다.
 */
export function takeNewHandoffs(
  seen: ReadonlySet<string> | null,
  cases: readonly CounselCase[],
): { fresh: CounselCase[]; seen: Set<string> } {
  const handedOffIds = new Set(cases.filter((c) => c.handoff !== null).map((c) => c.id))
  const fresh = seen ? unreadHandoffs(cases).filter((c) => !seen.has(c.id)) : []
  return { fresh, seen: handedOffIds }
}
