/**
 * 학폭 서류의 선택(체크) 칸 선택지. 양식 레이아웃(화면)과 목 서버(값)가 같은 id를 쓴다.
 * 선택 칸의 값은 고른 선택지 id를 쉼표로 이은 문자열이고, 비어 있으면 아무것도 고르지 않은 것이다.
 */

export type ChoiceOption = {
  id: string
  label: string
  /** 선택지 아래에 양식 원문으로 붙는 세부 항목 */
  detail?: string[]
}

export function parseChoice(value: string): string[] {
  return value === '' ? [] : value.split(',')
}

export function joinChoice(ids: string[]): string {
  return ids.join(',')
}

/** 접수·인지 경로 (1-3) */
export const REPORT_ROUTES: ChoiceOption[] = [
  { id: 'victim_direct', label: '피해자 직접신고' },
  { id: 'teacher_guardian', label: '담임, 보호자 신고' },
  { id: 'peer', label: '주변 학생 신고' },
]

/** 조사 방식: 조사관 배정 요청 / 학교 자체 조사 (1-3) */
export const INVESTIGATION_MODES: ChoiceOption[] = [
  { id: 'assign', label: '조사관 배정 요청' },
  { id: 'self', label: '학교 자체 조사' },
]

/** 1차 조사 / 보완조사 구분 (2-4). 하나만 고른다. */
export const INVESTIGATION_ROUNDS: ChoiceOption[] = [
  { id: 'first', label: '1차 조사' },
  { id: 'supplement', label: '보완조사' },
]

/** 가해(관련)·피해(관련) 분리 시행 여부 (1-3·2-4). 값은 사안 정보에서 온다. */
export const SEPARATION_ENFORCEMENT: ChoiceOption[] = [
  { id: 'enforced', label: '시행' },
  { id: 'not_enforced', label: '미시행' },
]

/** 분리 예외 사유(학교폭력예방법 제16조제1항). 값은 사안 정보에서 온다. */
export const SEPARATION_EXCEPTIONS: ChoiceOption[] = [
  { id: 'victim_objection', label: '피해학생 반대의사 표명' },
  { id: 'not_in_activity', label: '교육활동 중이 아님' },
  { id: 'urgent_separated', label: '학교장이 긴급 선도조치로 이미 가해학생과 피해학생이 분리됨' },
  { id: 'other_school', label: '타학교에 재학 중임 등' },
  {
    id: 'self_resolution',
    label: '학교장 자체해결 가능 요건에 모두 해당 (다음의 4개 항목 모두 충족)',
    detail: [
      '2주 이상의 신체적·정신적 치료가 필요한 진단서를 발급받지 않은 경우',
      '재산상 피해가 없는 경우 또는 재산상 피해가 즉각 복구되거나 복구 약속이 있는 경우',
      '학교폭력이 지속적이지 않은 경우',
      '학교폭력에 대한 신고, 진술, 자료제공 등에 대한 보복행위(정보통신망을 이용한 행위를 포함한다)가 아닌 경우',
    ],
  },
]
