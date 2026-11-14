/** 학교폭력 사안 화면 경로. 라우터 정의와 링크·이동이 같은 값을 쓴다. */

/** 교사 학교폭력 관리 화면 경로. */
export const SCHOOL_VIOLENCE_PATH = '/teacher/school-violence'

/** 사안 관리 탭(상담 관리 탭은 기본으로 열린다). */
export const SCHOOL_VIOLENCE_CASES_PATH = `${SCHOOL_VIOLENCE_PATH}?tab=cases`

/** 학폭 상담 관리에서 여는 상담 상세. */
export const schoolViolenceCounselDetailPath = (id: string) =>
  `${SCHOOL_VIOLENCE_PATH}/counsel/${id}`

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
