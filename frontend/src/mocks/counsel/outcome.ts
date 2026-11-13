import type { HandoffReason, Judgment } from '@/api/counselTypes.ts'
import { summarize } from './bot.ts'
import type { StoredCase } from './db.ts'
import { nowIso } from './db.ts'
import { createDocuments } from './documents.ts'
import { decideRisk, scan } from './judgment.ts'

/**
 * 전환·종료 처리. 「교사 알림(전환)」과 「챗봇 대화 닫기」는 따로 일어난다.
 * - 키워드 감지: 교사에게 알림만 보낸다(handOff). 챗봇 대화는 열린 채로 이어진다.
 * - 학생 버튼(「선생님과 상담하기」·「상담 끝내기」): 챗봇 대화를 닫는다(closeChat).
 * 교사 쪽 핸들러는 case.risk·case.handoff·summary·documents를 읽는다.
 */

/** 저장된 상담 건의 현재 판단 결과 */
export function judgmentOf(stored: StoredCase): Judgment {
  const c = stored.case
  return {
    handed_off: c.handoff !== null,
    handoff_reason: c.handoff?.reason ?? null,
    detected_keywords: c.detected_keywords,
    risk: c.risk,
  }
}

/**
 * 위험도·감지 키워드·요약을 지금까지의 대화로 다시 정한다.
 * 전환 뒤에도 대화가 이어지므로 발화마다, 그리고 대화를 닫을 때 부른다.
 */
function refresh(stored: StoredCase, studentRequested: boolean) {
  const s = scan(stored.messages)
  const c = stored.case
  const reason = c.handoff?.reason ?? null
  c.risk = decideRisk(s, studentRequested || reason === 'student_request')
  c.detected_keywords = s.detected
  if (c.handoff) c.handoff.detected_keywords = s.detected
  c.updated_at = nowIso()
  stored.summary = summarize({
    form: stored.form ?? { topic: '기타', answers: [] },
    messages: stored.messages,
    keywords: s.detected,
    reason,
    risk: c.risk,
    chatOpen: c.chat_open,
  })
}

/**
 * 교사에게 전환 알림을 보낸다: 승인대기로 올리고, 읽지 않음으로 두고, 사후 서류 초안 4종을 만든다.
 * 챗봇 대화(chat_open)는 건드리지 않는다.
 */
function handOff(stored: StoredCase, reason: HandoffReason) {
  const c = stored.case
  const at = nowIso()
  c.status = 'awaiting_approval'
  c.handoff = { reason, detected_keywords: [], at }
  c.read = false
  refresh(stored, reason === 'student_request')
  stored.documents = createDocuments({
    student: c.student,
    form: stored.form ?? { topic: '기타', answers: [] },
    summary: stored.summary ?? '',
    keywords: c.detected_keywords,
    risk: c.risk ?? 'medium',
    reason,
    at,
  })
}

/** 발화 뒤 판단: 키워드 조건이 처음 차면 교사에게 알린다. 이미 알렸으면 위험도·요약만 고친다. */
export function judgeAfterMessage(stored: StoredCase, triggered: boolean): Judgment {
  if (stored.case.handoff) refresh(stored, false)
  else if (triggered) handOff(stored, 'keyword')
  else stored.case.detected_keywords = scan(stored.messages).detected
  return judgmentOf(stored)
}

/**
 * 학생이 버튼으로 챗봇 대화를 닫는다.
 * - 「선생님과 상담하기」(handoff): 아직 알리지 않았으면 학생 요청으로 전환한다.
 * - 「상담 끝내기」(finish): 아직 알리지 않았으면 상담종료. 키워드로 이미 알렸으면 승인대기를 그대로 둔다.
 */
export function closeChat(stored: StoredCase, action: 'handoff' | 'finish'): Judgment {
  const c = stored.case
  c.chat_open = false
  if (c.handoff) refresh(stored, action === 'handoff')
  else if (action === 'handoff') handOff(stored, 'student_request')
  else {
    c.status = 'completed'
    refresh(stored, false)
  }
  return judgmentOf(stored)
}
