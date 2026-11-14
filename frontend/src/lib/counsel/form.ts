import type { CounselForm, FormAnswer } from '@/api/counselTypes.ts'

export const SCHOOL_VIOLENCE_TOPIC = '학교폭력'
export const DETAIL_QUESTION = '구체적인 내용'

type ChoiceQuestion = {
  question: string
  options: readonly string[]
  hint?: string
  multiple?: boolean
  exclusive?: string
  scaleLabels?: readonly [string, string]
}

export const INCIDENT: ChoiceQuestion = {
  question: '겪은 일',
  hint: '해당하는 것을 모두 골라 주세요.',
  multiple: true,
  options: [
    '맞거나 밀침',
    '욕설·놀림·모욕',
    '따돌림·무시',
    '돈이나 물건을 빼앗김',
    '강제 심부름',
    '단체방·SNS 괴롭힘',
    '원하지 않는 신체 접촉·성적 놀림',
    '기타',
  ],
}

export const START_TIME: ChoiceQuestion = {
  question: '시작 시기',
  options: ['오늘', '일주일 안', '한 달 안', '한 달보다 오래'],
}

export const DISTRESS_QUESTION = '얼마나 힘든가요'

export const CURRENT_STATE: ChoiceQuestion[] = [
  {
    question: '힘든 점',
    hint: '해당하는 것을 모두 골라 주세요.',
    multiple: true,
    options: [
      '다친 곳이 있다',
      '병원 치료를 받았다',
      '돈이나 물건 피해가 있다',
      '학교에 가기가 무섭다',
      '잠을 잘 못 잔다',
      '공부에 집중이 안 된다',
      '나를 해치고 싶은 생각이 든다',
    ],
  },
  {
    question: '보복·협박',
    hint: '“말하면 가만 안 둔다” 같은 말을 들은 적이 있나요?',
    options: ['예', '아니요'],
  },
  {
    question: '이 일을 아는 사람',
    multiple: true,
    exclusive: '아무도 모른다',
    options: ['아무도 모른다', '친구', '보호자', '선생님', '기타'],
  },
  {
    question: '남아 있는 자료',
    multiple: true,
    exclusive: '없다',
    options: ['캡처·사진·메시지', '본 친구가 있다', '병원 진단서', '없다'],
  },
  {
    question: DISTRESS_QUESTION,
    options: ['1', '2', '3', '4', '5'],
    scaleLabels: ['조금 힘들다', '매우 힘들다'],
  },
]

export const REQUESTED_HELP: ChoiceQuestion = {
  question: '받고 싶은 도움',
  hint: '원하는 도움을 모두 골라 주세요.',
  multiple: true,
  options: [
    '이야기만 들어 주면 좋겠다',
    '방법을 알려 주면 좋겠다',
    '선생님과 상담하고 싶다',
    '정식으로 신고하고 싶다',
    '상대 학생과 떨어지고 싶다',
  ],
}

export type Selections = Record<string, string[]>

export function toggleChoice(field: ChoiceQuestion, selected: string[], option: string) {
  if (selected.includes(option)) return selected.filter((value) => value !== option)
  if (!field.multiple || option === field.exclusive) return [option]
  return field.options.filter(
    (value) => value === option || (value !== field.exclusive && selected.includes(value)),
  )
}

export function buildCounselForm(selections: Selections, detail: string): CounselForm {
  const answers: FormAnswer[] = []
  const add = (question: string, answer: string) => {
    if (answer) answers.push({ question, answer })
  }

  add(INCIDENT.question, selections[INCIDENT.question]?.join(', ') ?? '')
  add(START_TIME.question, selections[START_TIME.question]?.join(', ') ?? '')
  add(DETAIL_QUESTION, detail.trim())
  for (const { question } of [...CURRENT_STATE, REQUESTED_HELP]) {
    add(question, selections[question]?.join(', ') ?? '')
  }
  return { topic: SCHOOL_VIOLENCE_TOPIC, answers }
}
