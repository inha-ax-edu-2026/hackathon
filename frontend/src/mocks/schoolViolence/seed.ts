import type { CounselForm, Message } from '@/api/counselTypes.ts'
import type { RelatedStudent, SchoolViolenceInfo } from '@/api/schoolViolenceTypes.ts'
import { DEMO_TEACHER_NAME } from '@/lib/counsel/identity.ts'
import { summarize } from '@/mocks/counsel/bot.ts'
import type { StoredCase } from '@/mocks/counsel/db.ts'
import { createDocuments } from '@/mocks/counsel/documents.ts'

/**
 * 학교폭력 사안 시드(가상 사례). 작성 예시 docx의 시나리오: 가온중학교 2학년 3반 한지우(피해 관련),
 * 정민혁·박도윤·최서진(가해 관련). 사안 자료 원문은 materials.ts에 있다.
 */

export const SCHOOL_NAME = '가온중학교'

/** 시드 상담 건: 피해 관련 학생(한지우)이 쓴 AI 챗봇 상담. 학생 목록(12번)에는 보이지 않는 21번이다. */
export const VICTIM_COUNSEL_ID = 'seed_4'

const HANDOFF_AT = '2026-11-13T19:45:00+09:00'

const FORM: CounselForm = {
  topic: '교우관계',
  answers: [
    { question: '지금 기분은 어때요? (1 힘듦 ~ 5 좋음)', answer: '1' },
    { question: '이 고민이 이어진 기간은 어느 정도인가요?', answer: '한 달 이상' },
    {
      question: '어떤 고민이 있나요?',
      answer: '반 단체방에서 계속 놀림을 받고, 친구들이 돈을 빌려 가고 돌려주지 않아요.',
    },
    { question: '선생님께 바라는 점이 있나요?', answer: '이 상황이 멈췄으면 좋겠어요.' },
  ],
}

const MESSAGES: Message[] = [
  {
    id: 'seed4_m1',
    role: 'bot',
    text: '안녕, 한지우. 반 친구들과의 일로 고민이 있다고 했지? 편하게 이야기해 줘.',
    at: '2026-11-13T19:41:00+09:00',
  },
  {
    id: 'seed4_m2',
    role: 'student',
    text: '10월 중순부터 우리 반 단체방에 제 사진이 올라오고 놀림을 받아요. 많이 괴롭고 무서워요.',
    at: '2026-11-13T19:42:00+09:00',
  },
  {
    id: 'seed4_m3',
    role: 'student',
    text: '돈을 빌려 달라고 해서 줬는데 돌려받지 못했어요. 이게 학교폭력인 건가요?',
    at: '2026-11-13T19:44:00+09:00',
  },
]

/** 시연 초기화 뒤에도 남는 한지우 AI 챗봇 상담 건. 교사가 이미 읽은 것으로 두어 알림이 울리지 않게 한다. */
export function createVictimCounselCase(): StoredCase {
  const keywords = ['학교폭력', '괴롭', '무서']
  const summary = summarize({
    form: FORM,
    messages: MESSAGES,
    keywords,
    reason: 'keyword',
    risk: 'high',
    chatOpen: false,
  })
  const student = { grade: 2, class: 3, number: 21, name: '한지우' }
  return {
    case: {
      id: VICTIM_COUNSEL_ID,
      kind: 'chatbot',
      status: 'awaiting_counsel',
      title: '[AI 챗봇] 교우관계 상담',
      student,
      schedule: { at: null, method: null },
      risk: 'high',
      handoff: { reason: 'keyword', detected_keywords: keywords, at: HANDOFF_AT },
      detected_keywords: keywords,
      read: true,
      chat_open: false,
      created_at: '2026-11-13T19:40:00+09:00',
      updated_at: '2026-11-13T20:00:00+09:00',
    },
    form: FORM,
    messages: MESSAGES,
    summary,
    documents: createDocuments({
      student,
      form: FORM,
      summary,
      keywords,
      risk: 'high',
      reason: 'keyword',
      at: HANDOFF_AT,
    }),
  }
}

function student(
  name: string,
  number: number,
  role: RelatedStudent['role'],
  noticeAt: string,
  extra: Partial<RelatedStudent> = {},
): RelatedStudent {
  return {
    name,
    grade: 2,
    class: 3,
    number,
    gender: 'male',
    role,
    guardian_notice: { notified: true, at: noticeAt, method: '유선' },
    note: null,
    found_during_investigation: false,
    ...extra,
  }
}

/**
 * 접수할 때 붙는 사안 정보. 접수 일시·사안번호는 접수하는 순간 정해진다.
 * 최서진은 조사 중에 확인된 학생이지만 시연 때문에 접수 때부터 넣어 두고 표시만 단다.
 */
export function createInfo(receivedAt: string, caseNumber: string): SchoolViolenceInfo {
  return {
    school_name: SCHOOL_NAME,
    case_number: caseNumber,
    received_at: receivedAt,
    teacher_name: DEMO_TEACHER_NAME,
    vice_principal: '문경숙',
    students: [
      student('한지우', 21, 'victim', '2026-11-13T21:00:00+09:00', {
        note: '신고자 본인',
      }),
      student('정민혁', 24, 'offender', '2026-11-16T10:00:00+09:00'),
      student('박도윤', 12, 'offender', '2026-11-16T10:00:00+09:00'),
      student('최서진', 28, 'offender', '2026-11-18T10:00:00+09:00', {
        note: '조사 중 확인',
        found_during_investigation: true,
      }),
    ],
    separation: { enforced: null, period: null, exception_reasons: [] },
  }
}
