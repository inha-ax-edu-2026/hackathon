import type { CounselForm, FormAnswer } from '@/api/counselTypes.ts'

/**
 * 학생이 쓰는 상담 양식. 항목은 예비교사 팀 확정 전(01번)이라 임시다.
 * 계약은 `topic` + 질문·답 목록이라 항목이 바뀌어도 이 파일만 고치면 된다.
 */
export type FormValues = {
  topic: string
  /** 1(힘듦) ~ 5(좋음). 고르지 않으면 null */
  mood: number | null
  duration: string | null
  concern: string
  wish: string
}

export const TOPICS = ['학업', '진로', '교우관계', '가정', '마음·건강', '기타']
export const DURATIONS = ['며칠', '1~2주', '한 달 이상', '오래전부터']

export const QUESTIONS = {
  mood: '지금 기분은 어때요? (1 힘듦 ~ 5 좋음)',
  duration: '이 고민이 이어진 기간은 어느 정도인가요?',
  /** 목 챗봇은 「고민」이 든 질문의 답을 첫 인사에 쓴다. */
  concern: '어떤 고민이 있나요?',
  wish: '선생님께 바라는 점이 있나요?',
} as const

export const EMPTY_FORM_VALUES: FormValues = {
  topic: '',
  mood: null,
  duration: null,
  concern: '',
  wish: '',
}

/** 필수 항목: 주제와 고민. */
export function isFormComplete(values: FormValues) {
  return values.topic !== '' && values.concern.trim() !== ''
}

/** 비워 둔 선택 항목은 답 목록에서 뺀다. */
export function buildCounselForm(values: FormValues): CounselForm {
  const answers: FormAnswer[] = []
  if (values.mood !== null) answers.push({ question: QUESTIONS.mood, answer: String(values.mood) })
  if (values.duration) answers.push({ question: QUESTIONS.duration, answer: values.duration })
  answers.push({ question: QUESTIONS.concern, answer: values.concern.trim() })
  if (values.wish.trim()) answers.push({ question: QUESTIONS.wish, answer: values.wish.trim() })
  return { topic: values.topic, answers }
}
