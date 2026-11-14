/** 학생 「학폭 상담」 목록 */
export const STUDENT_SCHOOL_VIOLENCE_PATH = '/student/school-violence'
/** AI 챗봇 상담의 상담 양식 작성 */
export const CHATBOT_FORM_PATH = `${STUDENT_SCHOOL_VIOLENCE_PATH}/chatbot/new`
/** AI 챗봇 상담(대화 또는 읽기 전용) */
export const chatbotPath = (id: string) => `${STUDENT_SCHOOL_VIOLENCE_PATH}/chatbot/${id}`
