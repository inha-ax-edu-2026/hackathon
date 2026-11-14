/** 상담 화면 경로. 라우터 정의와 링크·이동이 같은 값을 쓴다. `:id` 자리에 ':id'를 넘기면 라우트 패턴이 된다. */

/** 학생 「내 상담」 목록 */
export const STUDENT_COUNSEL_PATH = '/student/counsel'
/** 학생 「학폭 상담」 목록 */
export const STUDENT_SCHOOL_VIOLENCE_PATH = '/student/school-violence'
/** AI 챗봇 상담의 상담 양식 작성 */
export const chatbotFormPath = (listPath: string) => `${listPath}/chatbot/new`
export const CHATBOT_FORM_PATH = chatbotFormPath(STUDENT_COUNSEL_PATH)
/** AI 챗봇 상담(대화 또는 읽기 전용) */
export const chatbotPath = (id: string, listPath = STUDENT_COUNSEL_PATH) =>
  `${listPath}/chatbot/${id}`
/** 개인상담 신청 재현 */
export const counselRegisterPath = (listPath: string) => `${listPath}/register`
export const COUNSEL_REGISTER_PATH = counselRegisterPath(STUDENT_COUNSEL_PATH)

/** 교사 「개인상담 관리」 목록 */
export const TEACHER_COUNSEL_PATH = '/teacher/manage-apply/counsel'
/** 상담 건 상세 */
export const counselDetailPath = (id: string) => `${TEACHER_COUNSEL_PATH}/${id}`
