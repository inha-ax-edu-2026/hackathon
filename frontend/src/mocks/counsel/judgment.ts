import type { Message, Risk } from '@/api/counselTypes.ts'

/**
 * 판단 규칙(명세 「판단 규칙」, 제안서 4절). 전환·위험도는 키워드 규칙만으로 정한다. AI는 관여하지 않는다.
 * 키워드 목록과 기준은 02번(예비교사 팀) 확정 전 임시값이다. 값이 오면 KEYWORDS만 바꾼다.
 */
export const KEYWORDS = {
  /** 학생 발화에 1번만 나와도 즉시 전환 */
  severe: ['죽고 싶', '자해', '사라지고 싶', '맞았', '폭행', '학교폭력'],
  /** 이 말이 든 학생 발화가 mildThreshold번 쌓이면 전환 */
  mild: ['힘들', '무서', '괴롭', '따돌', '왕따', '외로', '가기 싫', '불안'],
  mildThreshold: 3,
}

/** 띄어쓰기를 지운다. 「가기싫어」와 「가기 싫어」가 같은 키워드로 잡히게 한다. */
const squash = (text: string) => text.replace(/\s+/g, '')

const matches = (text: string, keywords: string[]) => {
  const target = squash(text)
  return keywords.filter((keyword) => target.includes(squash(keyword)))
}

/** 학생 발화만 센다. 상담 양식의 글은 messages에 없으므로 세지 않는다. */
export function scan(messages: Message[]) {
  const said = messages.filter((m) => m.role === 'student').map((m) => m.text)
  const severe = said.flatMap((text) => matches(text, KEYWORDS.severe))
  const mildPerUtterance = said.map((text) => matches(text, KEYWORDS.mild))
  return {
    /** 발화 순서대로, 중복 없이 */
    detected: [
      ...new Set(said.flatMap((text) => matches(text, [...KEYWORDS.severe, ...KEYWORDS.mild]))),
    ],
    severeCount: severe.length,
    /** 경미 키워드가 하나라도 든 발화 수(한 발화에 여러 개여도 1번) */
    mildUtterances: mildPerUtterance.filter((found) => found.length > 0).length,
  }
}

export type Scan = ReturnType<typeof scan>

/** 키워드 조건이 찼는지. 심각 1번 또는 경미 발화 기준 횟수. */
export const keywordTriggered = (s: Scan) =>
  s.severeCount > 0 || s.mildUtterances >= KEYWORDS.mildThreshold

/** 위험도는 전환 시점에 정하고, 전환 뒤 대화가 이어지면 발화마다 다시 정한다. 높음 = 심각 1개 이상, 보통 = 경미 발화 1번 이상 또는 학생 요청 전환. */
export function decideRisk(s: Scan, studentRequested: boolean): Risk {
  if (s.severeCount > 0) return 'high'
  if (s.mildUtterances > 0 || studentRequested) return 'medium'
  return 'low'
}
