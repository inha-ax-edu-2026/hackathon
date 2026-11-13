import type { HandoffReason, Judgment } from '@/api/counselTypes.ts'
import { summarize } from './bot.ts'
import type { StoredCase } from './db.ts'
import { nowIso } from './db.ts'
import { createDocuments } from './documents.ts'
import { decideRisk, scan } from './judgment.ts'

/**
 * AI 챗봇 상담을 닫는다: 전환(reason 있음) 또는 전환 없이 끝내기(reason null).
 * 위험도를 확정하고 전환 요약을 만들어 저장된 상담 건(case.risk·case.handoff·summary)에 남긴다.
 * 교사 쪽 핸들러는 이 필드를 읽는다. 전환(reason 있음)이면 사후 서류 초안 4종도 여기서 만든다.
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
  if (reason) {
    stored.documents = createDocuments({
      student: c.student,
      form: stored.form ?? { topic: '기타', answers: [] },
      summary: stored.summary,
      keywords: s.detected,
      risk,
      reason,
      at,
    })
  }

  return {
    handed_off: reason !== null,
    handoff_reason: reason,
    detected_keywords: s.detected,
    risk,
  }
}
