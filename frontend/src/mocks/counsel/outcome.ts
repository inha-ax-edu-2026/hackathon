import type { HandoffReason, Judgment } from '@/api/counselTypes.ts'
import { summarize } from './bot.ts'
import type { StoredCase } from './db.ts'
import { nowIso } from './db.ts'
import { decideRisk, scan } from './judgment.ts'

/**
 * AI 챗봇 상담을 닫는다: 전환(reason 있음) 또는 전환 없이 끝내기(reason null).
 * 위험도를 확정하고 전환 요약을 만들어 저장된 상담 건(case.risk·case.handoff·summary)에 남긴다.
 * 교사 쪽 핸들러는 이 필드를 읽는다. 전환 시점에 만드는 산출물(서류 초안 등)도 여기에 붙인다.
 */
export function closeCase(stored: StoredCase, reason: HandoffReason | null): Judgment {
  const s = scan(stored.messages)
  const risk = decideRisk(s, reason === 'student_request')
  const at = nowIso()
  const c = stored.case

  c.risk = risk
  c.detected_keywords = s.detected
  c.updated_at = at
  if (reason) {
    c.status = 'awaiting_approval'
    c.handoff = { reason, detected_keywords: s.detected, at }
    c.read = false
  } else {
    c.status = 'completed'
  }
  stored.summary = summarize(
    stored.form ?? { topic: '기타', answers: [] },
    stored.messages,
    s.detected,
  )

  return {
    handed_off: reason !== null,
    handoff_reason: reason,
    detected_keywords: s.detected,
    risk,
  }
}
