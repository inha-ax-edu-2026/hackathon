import type { DocumentField, SchoolViolenceInfo } from '@/api/schoolViolenceTypes.ts'
import type { ChoiceOption } from './options.ts'

/**
 * 학폭 서류 양식 레이아웃. 가이드북 표를 102열 격자(작성 예시 docx의 gridSpan 합계)로 옮긴 데이터다.
 * 서류 응답의 칸(`DocumentField`)은 값만 가지고 있고, 표 모양은 이 레이아웃이 정한다.
 * 칸은 `{ type: 'field', id }`로 가리키므로, 쟁점 n개·가해 관련 학생별 판단요소 같은 반복 구조는
 * 레이아웃 함수가 칸 id(`issue.1.victim_claim`, `factor.severity.정민혁`)를 보고 행을 만들어 낸다.
 */

export const FORM_GRID_COLUMNS = 102

/** 셀 안에 이어 붙는 조각. */
export type FormNode =
  /** 양식 원문(검정). `guide`는 작성 안내 문구(회색). */
  | { type: 'text'; text: string; tone?: 'guide' }
  | { type: 'br' }
  /**
   * 서류 칸. 처리 방식에 따라 AI 칸(파랑)·사안 정보 칸·판단 칸(주황)으로 보인다.
   * 칸이 없으면(아직 초안 전) 빈 판단 칸처럼 보인다.
   */
  | { type: 'field'; id: string; placeholder?: string; inline?: boolean }
  /** 체크 칸. 칸 값은 고른 선택지 id를 쉼표로 이은 문자열이다. */
  | {
      type: 'choice'
      id: string
      options: ChoiceOption[]
      /** `stack`은 한 줄에 하나씩, `inline`은 한 줄에 이어서 */
      direction?: 'stack' | 'inline'
      /** `box`는 ■/□, `paren`은 「항목 ( √ )」 */
      mark?: 'box' | 'paren'
      /** 양식상 하나만 고르는 칸(조사관 배정 요청/학교 자체 조사, 1차/보완 조사 등). 편집기가 라디오로 보인다. */
      single?: boolean
    }
  /** 사안 정보에서 파생한 글(관련 학생 표의 행, 학생 이름 목록). `field`는 눌렀을 때 설명할 칸 id. */
  | { type: 'info'; field: string; text: string }

export type FormCell = {
  /** 102열 중 차지하는 열 수 */
  span: number
  rowSpan?: number
  /** 라벨 셀(머리글, 회색 배경) */
  label?: boolean
  align?: 'center'
  nodes: FormNode[]
}

export type FormRow = FormCell[]

export type FormTable = {
  rows: FormRow[]
  /** 인쇄할 때 이 표 앞에서 쪽을 나눈다(2-4). */
  pageBreakBefore?: boolean
}

export type FormLayout = {
  /** 양식 제목. 예: 「학교폭력사안 접수보고서」 */
  title: string
  /** 제목 아래 줄(사안번호 등) */
  preamble: FormNode[]
  tables: FormTable[]
}

/** 레이아웃을 만들 때 쓰는 입력. 반복 구조는 `fields`나 `info`를 보고 행을 만든다. */
export type FormLayoutContext = {
  info: SchoolViolenceInfo
  fields: DocumentField[]
}

export type FormLayoutBuilder = (context: FormLayoutContext) => FormLayout
