import type { CaseStatus, HandoffReason, Risk } from '@/api/counselTypes.ts'

/** 상담상태 화면 표기. 학생 목록은 in_progress를 「상담중」으로 보이고, 교사 목록에는 in_progress가 없다. */
export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  in_progress: '상담중',
  awaiting_approval: '승인대기',
  awaiting_counsel: '상담대기',
  completed: '상담종료',
  in_counsel: '상담중',
  awaiting_confirmation: '확인대기',
  canceled: '상담취소',
}

export const RISK_LABEL: Record<Risk, string> = { low: '낮음', medium: '보통', high: '높음' }

export const HANDOFF_REASON_LABEL: Record<HandoffReason, string> = {
  keyword: '키워드 감지',
  student_request: '학생 요청',
}

/** 학생에게 보이는 고지. 상담 방식 선택 창과 대화 닫기 확인 창(선생님과 상담하기·상담 끝내기)에만 쓴다. */
export const TEACHER_VISIBILITY_NOTICE =
  '선생님은 요약·위험도·상담 양식을 보고, 대화 내용 전체는 보지 않아요'
