import { describe, expect, it } from 'vitest'
import {
  fetchParentInbox,
  fetchParentWorkspace,
  sendParentQuestion,
  submitParentInquiry,
} from '@/api/parentGuidance.ts'
import { apiFetch } from '@/lib/api.ts'

describe('학부모 안내 연동', () => {
  it('일반 안내·담당 기관·응답 제한을 구분하고 출처를 제공한다', async () => {
    const school = await sendParentQuestion('guardian_victim', {
      text: '학교 처리 절차가 궁금해요',
      request_id: 'procedure',
    })
    expect(school.turn.answer.category).toBe('school')
    expect(school.turn.answer.card?.sources[0].url).toMatch(/^https:/)
    const agency = await sendParentQuestion('guardian_victim', {
      text: '치료비 지원',
      request_id: 'agency',
    })
    expect(agency.turn.answer.category).toBe('agency')
    expect(agency.turn.answer.card?.contact).toBe('1688-4900')
    const restricted = await sendParentQuestion('guardian_victim', {
      text: '상대 학생 연락처 알려줘',
      request_id: 'privacy',
    })
    expect(restricted.turn.answer.category).toBe('restricted')
    expect((await fetchParentInbox()).guidance_log).toHaveLength(1)
  })
  it('긴급 질문은 한 번만 교사 문의함에 등록하고 답변 대기를 안내하지 않는다', async () => {
    const body = { text: '지금 아이가 폭행을 당하고 있어요', request_id: 'urgent' }
    const first = await sendParentQuestion('guardian_victim', body)
    const again = await sendParentQuestion('guardian_victim', body)
    expect(first.turn.inquiry_id).toBe(again.turn.inquiry_id)
    expect(first.turn.answer.urgent).toBe(true)
    expect(first.turn.answer.text).toContain('112')
    expect(first.turn.answer.text).not.toContain('1~2일')
    const inbox = await fetchParentInbox()
    expect(inbox.inquiries).toHaveLength(1)
    expect(inbox.inquiries[0].urgent).toBe(true)
    expect(inbox.inquiries[0].read).toBe(false)
  })
  it('교사 답변은 문의한 보호자 화면에만 반영된다', async () => {
    const body = {
      text: '면담 일정을 조정하고 싶어요',
      request_id: 'inquiry',
      desired_action: '오후 면담',
      preferred_reply: 'chat' as const,
      callback_number: '',
    }
    const sent = await submitParentInquiry('guardian_victim', body)
    expect(sent.message).toContain('1~2일')
    expect((await submitParentInquiry('guardian_victim', body)).inquiry.id).toBe(sent.inquiry.id)
    await apiFetch(`/api/teacher/parent-inquiries/${sent.inquiry.id}/replies`, {
      method: 'POST',
      body: { text: '가능 시간을 확인한 뒤 안내하겠습니다.' },
    })
    expect((await fetchParentWorkspace('guardian_victim')).inquiries[0].replies[0].text).toContain(
      '가능 시간',
    )
    expect((await fetchParentWorkspace('guardian_offender')).inquiries).toHaveLength(0)
  })
  it('절차 기록이 양측 보호자에게 중복 없이 안내되며 초기화된다', async () => {
    const body = { kind: 'committee_requested', date: '2026-11-14', request_id: 'notice' }
    const path = '/api/teacher/parent-notices/parent_demo_case/events'
    await apiFetch(path, { method: 'POST', body })
    await apiFetch(path, { method: 'POST', body })
    for (const actor of ['guardian_victim', 'guardian_offender']) {
      const workspace = await fetchParentWorkspace(actor)
      expect(workspace.notices).toHaveLength(1)
      expect(workspace.profile.stage).toBe('committee_requested')
      expect(workspace.notices[0].student).toBe(workspace.profile.student.name)
    }
    await apiFetch('/api/demo/reset', { method: 'POST' })
    expect((await fetchParentWorkspace('guardian_victim')).notices).toHaveLength(0)
  })
  it('업무 범위 밖 질문에는 교사 권한 밖임을 먼저 밝히고 소관 기관을 안내한다', async () => {
    for (const [i, text] of [
      '우리 애 무슨 조치 받아요?',
      '치료비는요?',
      '결과에 불복하고 싶어요',
    ].entries()) {
      const { turn } = await sendParentQuestion('guardian_victim', {
        text,
        request_id: `scope-${i}`,
      })
      expect(turn.answer.category).toBe('agency')
      expect(turn.answer.card?.scope_notice).toContain('학교(담당 교사)의 업무 범위가 아니며')
      expect(turn.answer.text.startsWith(turn.answer.card?.scope_notice ?? 'MISSING')).toBe(true)
      expect(turn.answer.card?.contact).toBeTruthy()
      expect(turn.answer.card?.sources.length).toBeGreaterThan(0)
      expect(turn.answer.offer_teacher).toBe(false)
    }
    expect((await fetchParentWorkspace('guardian_victim')).inquiries).toHaveLength(0)
  })
})
