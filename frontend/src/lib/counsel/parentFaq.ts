export const PARENT_FAQ = [
  {
    question: '학교에 어떻게 알리나요?',
    keywords: /신고|연락|문의|어디에|누구에게|알리/,
    answer:
      '담임 선생님이나 학교의 학교폭력 담당자에게 연락해 자녀에게 들은 내용과 직접 확인한 사실을 구분해 전달해 주세요. 학교에 접수 방법과 담당자를 물어볼 수 있어요. 117 학교폭력 신고센터에서도 신고나 상담을 할 수 있어요.',
  },
  {
    question: '상담 전에 무엇을 정리하면 좋나요?',
    keywords: /정리|준비|증거|자료|캡처|기록|무엇을/,
    answer:
      '언제, 어디에서, 어떤 일이 있었는지와 그 내용을 어떻게 알게 됐는지 적어 두면 상담에 도움이 돼요. 관련 메시지나 사진이 있다면 날짜와 앞뒤 맥락이 보이도록 원본을 보관하고, 학교 담당자에게 제출 방법을 확인해 주세요.',
  },
  {
    question: '학교에 알린 뒤 어떤 절차가 진행되나요?',
    keywords: /절차|접수.*후|신고.*후|신고.*뒤|알린.*후|알린.*뒤|조사|심의/,
    answer:
      '학교가 신고를 접수하면 처음 알려진 사실을 확인하고 관련 학생의 보호자에게 접수 사실을 안내해요. 자녀에게 필요한 안전 조치와 이후 조사 일정, 추가로 낼 자료가 있는지는 학교 담당자에게 확인해 주세요.',
  },
]

export function answerParentFaq(question: string) {
  const exact = PARENT_FAQ.find((entry) => entry.question === question)
  if (exact) return exact.answer

  // 신고 이후 절차를 묻는 문장도 신고 경로와 관련된 단어를 포함할 수 있다.
  const match = PARENT_FAQ.toReversed().find((entry) => entry.keywords.test(question))
  return (
    match?.answer ??
    '구체적인 상황은 학교 담당자와 확인해 주세요. 자녀가 이야기한 일과 직접 확인한 내용을 구분해 전달하고, 현재 안전에 필요한 조치와 다음 연락 방법을 물어볼 수 있어요.'
  )
}
