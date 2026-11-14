/**
 * 가해 관련 학생별로 나뉘는 서류 칸(2-4의 시행령 제19조 판단요소)의 ID 규칙.
 * 칸 ID는 `factor.<판단요소>.<학생 이름>`이다. 예: `factor.severity.정민혁`.
 * 관련 학생 이름이 사안 안에서 겹치지 않으므로(사안 정보 수정이 거절한다) 이름이 곧 학생 구별 기준이다.
 * 사안 정보에서 가해 관련 학생이 늘거나 줄면 이미 만든 서류의 칸도 이 규칙을 보고 맞춘다.
 */

const PREFIX = 'factor.'

/** 판단요소 키(`severity`)와 학생 이름으로 칸 ID를 만든다. */
export const offenderFieldId = (key: string, name: string) => `${PREFIX}${key}.${name}`

/** 칸 ID가 학생별 칸이면 판단요소 키·학생 이름으로 나눈다. 아니면 null. */
export function parseOffenderFieldId(id: string): { key: string; name: string } | null {
  if (!id.startsWith(PREFIX)) return null
  const rest = id.slice(PREFIX.length)
  const dot = rest.indexOf('.')
  if (dot <= 0 || dot === rest.length - 1) return null
  return { key: rest.slice(0, dot), name: rest.slice(dot + 1) }
}
