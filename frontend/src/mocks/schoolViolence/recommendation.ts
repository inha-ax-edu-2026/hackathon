import type { SchoolViolenceRecommendation } from '@/api/counselTypes.ts'

/**
 * 학교폭力으로 볼 만한 감지 키워드. 상담 판단 규칙(mocks/counsel/judgment.ts)의 KEYWORDS 중 일부라
 * 감지된 키워드 문자열과 그대로 비교한다. 목록은 예비교사 팀 확정 전 임시값이다.
 */
const SCHOOL_VIOLENCE_KEYWORDS = ['학교폭력', '폭행', '맞았', '따돌', '왕따', '괴롭']

/** 상담 건의 감지 키워드 중 학폭 키워드가 있으면 권고한다. 권고는 사안을 만들지 않는다. */
export function recommendSchoolViolence(detectedKeywords: string[]): SchoolViolenceRecommendation {
  const keywords = detectedKeywords.filter((keyword) => SCHOOL_VIOLENCE_KEYWORDS.includes(keyword))
  return { recommended: keywords.length > 0, keywords }
}
