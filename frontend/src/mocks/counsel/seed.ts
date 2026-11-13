import type { CounselCase } from '@/api/counselTypes.ts'
import { DEMO_STUDENT } from '@/lib/counsel/identity.ts'
import type { StoredCase } from './db.ts'

/**
 * 시연 초기화 뒤 남는 기존 개인상담 건. 교사 목록이 비어 보이지 않게 여러 상태로 둔다.
 * 시각은 시연 중 새로 생기는 AI 챗봇 상담 건보다 늘 앞서도록 과거로 고정한다.
 */
export function createSeedCases(): StoredCase[] {
  return [
    individual({
      id: 'seed_1',
      status: 'awaiting_confirmation',
      title: '2학기 진로 상담',
      student: { grade: 2, class: 3, number: 5, name: '박서준' },
      schedule: { at: '2026-11-16T16:00:00+09:00', method: '대면' },
      created_at: '2026-11-10T09:12:00+09:00',
    }),
    individual({
      id: 'seed_2',
      status: 'awaiting_counsel',
      title: '중간고사 성적 상담',
      student: { grade: 2, class: 3, number: 21, name: '최유나' },
      schedule: { at: '2026-11-14T12:30:00+09:00', method: '화상' },
      created_at: '2026-11-07T15:40:00+09:00',
    }),
    individual({
      id: 'seed_3',
      status: 'completed',
      title: '학급 생활 상담',
      student: DEMO_STUDENT,
      schedule: { at: '2026-10-28T16:30:00+09:00', method: '대면' },
      created_at: '2026-10-24T11:05:00+09:00',
    }),
  ]
}

type SeedInput = Pick<
  CounselCase,
  'id' | 'status' | 'title' | 'student' | 'schedule' | 'created_at'
>

function individual(input: SeedInput): StoredCase {
  return {
    case: {
      ...input,
      kind: 'individual',
      risk: null,
      handoff: null,
      detected_keywords: [],
      read: true,
      chat_open: false,
      updated_at: input.created_at,
    },
    form: null,
    messages: [],
    summary: null,
  }
}
