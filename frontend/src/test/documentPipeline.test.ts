import { describe, expect, it } from 'vitest'
import {
  finalStepIndex,
  hasSeenDocuments,
  markDocumentsSeen,
  PIPELINE_STEPS,
  stepStates,
} from '@/components/counsel/detail/documentPipeline.ts'

describe('사후 서류 진행 단계', () => {
  it('모두 승인하기 전에는 「검토 대기」, 승인하면 「승인 완료」가 현재 단계다', () => {
    expect(PIPELINE_STEPS[finalStepIndex(false)]).toBe('검토 대기')
    expect(PIPELINE_STEPS[finalStepIndex(true)]).toBe('승인 완료')
  })

  it('현재 단계 앞은 완료, 현재는 진행 중, 뒤는 대기다', () => {
    expect(stepStates(finalStepIndex(false))).toEqual([
      'done',
      'done',
      'done',
      'done',
      'active',
      'pending',
    ])
  })

  it('「승인 완료」에 도달하면 그 단계도 완료로 보인다', () => {
    expect(stepStates(finalStepIndex(true)).every((state) => state === 'done')).toBe(true)
  })

  it('처음 연 건만 기록이 없고, 기록한 뒤에는 연 적 있는 건이다', () => {
    expect(hasSeenDocuments('c_new')).toBe(false)
    markDocumentsSeen('c_new')
    expect(hasSeenDocuments('c_new')).toBe(true)
    expect(hasSeenDocuments('c_other')).toBe(false)
  })
})
