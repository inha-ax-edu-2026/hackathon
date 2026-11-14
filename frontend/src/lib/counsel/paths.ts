/** 학생 「학폭 상담」 목록 */
export const STUDENT_SCHOOL_VIOLENCE_PATH = '/student/school-violence'
/** AI 챗봇 상담의 상담 양식 작성 */
export const CHATBOT_FORM_PATH = `${STUDENT_SCHOOL_VIOLENCE_PATH}/chatbot/new`
/** 슈퍼스쿨 개인상담 신청 안내 */
export const COUNSEL_REGISTER_PATH = `${STUDENT_SCHOOL_VIOLENCE_PATH}/register`
/** AI 챗봇 상담(대화 또는 읽기 전용) */
export const chatbotPath = (id: string) => `${STUDENT_SCHOOL_VIOLENCE_PATH}/chatbot/${id}`
