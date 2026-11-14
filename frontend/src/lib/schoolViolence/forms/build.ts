import type { FormCell, FormLayout, FormNode } from './types.ts'

/** 레이아웃을 짧게 쓰기 위한 도우미. 양식 원문·안내·칸·줄바꿈·셀. */

export const text = (value: string): FormNode => ({ type: 'text', text: value })
export const guide = (value: string): FormNode => ({ type: 'text', text: value, tone: 'guide' })
export const br: FormNode = { type: 'br' }

export const field = (
  id: string,
  options: { placeholder?: string; inline?: boolean } = {},
): FormNode => ({ type: 'field', id, ...options })

export const info = (fieldId: string, value: string): FormNode => ({
  type: 'info',
  field: fieldId,
  text: value,
})

type CellOptions = Pick<FormCell, 'rowSpan' | 'align'>

/** 값 셀 */
export const cell = (span: number, nodes: FormNode[], options: CellOptions = {}): FormCell => ({
  span,
  nodes,
  ...options,
})

/** 라벨 셀. 글자는 `\n`으로 줄을 나눈다. */
export const label = (span: number, value: string, options: CellOptions = {}): FormCell => ({
  span,
  label: true,
  align: 'center',
  nodes: value
    .split('\n')
    .flatMap((line, index) => (index === 0 ? [text(line)] : [br, text(line)])),
  ...options,
})

type ChoiceNode = Extract<FormNode, { type: 'choice' }>

/** 레이아웃의 체크 칸 조각을 모두 모은다(제목 아래 줄 포함). */
function choiceNodes(layout: FormLayout): ChoiceNode[] {
  const found: ChoiceNode[] = []
  const collect = (nodes: FormNode[]) => {
    for (const node of nodes) if (node.type === 'choice') found.push(node)
  }
  collect(layout.preamble)
  for (const table of layout.tables) {
    for (const row of table.rows) for (const { nodes } of row) collect(nodes)
  }
  return found
}

/** 칸 id → 그 칸이 체크 칸이면 선택지. 칸 값을 화면 글자로 바꿀 때 쓴다. */
export function collectChoices(layout: FormLayout) {
  return new Map(choiceNodes(layout).map((node) => [node.id, node.options]))
}

/** 양식상 하나만 고르는 체크 칸의 id. 편집기가 이 칸은 라디오로 보인다. */
export function collectSingleChoiceIds(layout: FormLayout) {
  return new Set(
    choiceNodes(layout)
      .filter((node) => node.single)
      .map((node) => node.id),
  )
}
