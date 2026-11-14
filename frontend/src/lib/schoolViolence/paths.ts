/** 학교폭력 사안 화면 경로. 라우터 정의와 링크·이동이 같은 값을 쓴다. */

/** 교사 셸의 사안 화면 접두. 상담 메뉴(`/teacher/manage-apply/counsel`)와 겹치지 않게 별도 접두를 쓴다. */
export const SCHOOL_VIOLENCE_PATH = '/teacher/school-violence'

/** 사안 페이지 */
export const schoolViolenceCasePath = (id: string) => `${SCHOOL_VIOLENCE_PATH}/${id}`

/** 서류 편집 화면. formId는 가이드북 서식 번호(예: `1-3`). */
export const schoolViolenceDocumentPath = (id: string, formId: string) =>
  `${SCHOOL_VIOLENCE_PATH}/${id}/documents/${formId}`

/** 사안 정보 편집 패널을 여는 검색 파라미터(`?edit=info`). 서류의 사안 정보 칸에서 여기로 안내한다. */
export const INFO_EDIT_PARAM = 'edit'
export const INFO_EDIT_VALUE = 'info'

/** 편집 패널이 열린 채로 사안 페이지를 연다. */
export const schoolViolenceInfoEditPath = (id: string) =>
  `${schoolViolenceCasePath(id)}?${INFO_EDIT_PARAM}=${INFO_EDIT_VALUE}`
