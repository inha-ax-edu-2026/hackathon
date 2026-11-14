import type { ReactNode } from 'react'
import type { DocumentField } from '@/api/schoolViolenceTypes.ts'
import { parseChoice } from '@/lib/schoolViolence/forms/options.ts'
import {
  FORM_GRID_COLUMNS,
  type FormCell,
  type FormLayout,
  type FormNode,
} from '@/lib/schoolViolence/forms/types.ts'
import { cn } from '@/lib/utils.ts'

type FormViewProps = {
  layout: FormLayout
  fields: DocumentField[]
  /** 지금 옆 패널에 보이는 칸 */
  selectedFieldId: string | null
  onSelectField: (id: string) => void
  /**
   * 선택한 칸을 그 자리에서 고치는 편집기. 사안 정보 칸(admin)은 서류에서 고치지 않으므로 부르지 않는다.
   * 없으면 칸을 눌러도 옆 패널만 바뀐다.
   */
  renderEditor?: (field: DocumentField) => ReactNode
}

type Context = {
  fieldsById: Map<string, DocumentField>
  selectedFieldId: string | null
  onSelectField: (id: string) => void
  renderEditor?: (field: DocumentField) => ReactNode
}

/** 선택돼 편집 중인 칸이면 편집기를, 아니면 null. */
function editorFor(ctx: Context, field: DocumentField | undefined) {
  if (!ctx.renderEditor || !field || field.kind === 'admin') return null
  return ctx.selectedFieldId === field.id ? ctx.renderEditor(field) : null
}

const COLUMN_WIDTH = `${100 / FORM_GRID_COLUMNS}%`
const COLUMNS = Array.from({ length: FORM_GRID_COLUMNS }, (_, index) => index)

/**
 * 가이드북 표 모양 양식. 레이아웃(`FormLayout`)이 정한 102열 표에 서류 칸을 끼워 보여준다.
 * 칸 색: AI 칸(narrative)은 파랑, 판단 칸(manual·sensitive)은 주황, 사안 정보 칸(admin)은 검정 점선,
 * 양식 원문은 검정이다. 칸을 누르면 `onSelectField`로 알린다(옆 패널·편집이 이를 이어받는다).
 * 서류마다 다른 건 레이아웃뿐이라 1-3과 2-4가 이 컴포넌트를 함께 쓴다.
 */
export function FormView({
  layout,
  fields,
  selectedFieldId,
  onSelectField,
  renderEditor,
}: FormViewProps) {
  const ctx: Context = {
    fieldsById: new Map(fields.map((field) => [field.id, field])),
    selectedFieldId,
    onSelectField,
    renderEditor,
  }

  return (
    <article
      aria-label={layout.title}
      className="rounded-xl border bg-white p-6 text-[13px] leading-relaxed text-black shadow-xs print:rounded-none print:border-0 print:p-0 print:shadow-none"
    >
      <h2 className="mb-2 text-center text-xl font-bold tracking-wide">{layout.title}</h2>
      <p className="mb-2">
        <Nodes nodes={layout.preamble} ctx={ctx} />
      </p>
      {layout.tables.map((table, tableIndex) => (
        <table
          // 표가 여러 개일 때(2-4) 위치로 구별한다. 표는 레이아웃이 바뀌어도 순서가 같다.
          // biome-ignore lint/suspicious/noArrayIndexKey: 표에는 id가 없다
          key={tableIndex}
          className={cn(
            'w-full table-fixed border-collapse border border-black/70',
            tableIndex > 0 && 'mt-4',
            table.pageBreakBefore && 'print:break-before-page',
          )}
        >
          <colgroup>
            {COLUMNS.map((column) => (
              <col key={column} style={{ width: COLUMN_WIDTH }} />
            ))}
          </colgroup>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: 행에는 id가 없다
              <tr key={rowIndex} className="break-inside-avoid">
                {row.map((cell, cellIndex) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: 셀에는 id가 없다
                  <Cell key={cellIndex} cell={cell} ctx={ctx} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </article>
  )
}

function Cell({ cell, ctx }: { cell: FormCell; ctx: Context }) {
  return (
    <td
      colSpan={cell.span}
      rowSpan={cell.rowSpan}
      className={cn(
        'border border-black/70 px-2 py-1.5 align-top break-words',
        cell.label && 'bg-form-label font-medium print:[print-color-adjust:exact]',
        cell.align === 'center' && 'text-center align-middle',
        'print:break-inside-avoid',
      )}
    >
      <Nodes nodes={cell.nodes} ctx={ctx} />
    </td>
  )
}

function Nodes({ nodes, ctx }: { nodes: FormNode[]; ctx: Context }) {
  return nodes.map((node, index) => (
    // 같은 셀 안의 조각은 순서가 곧 정체다.
    // biome-ignore lint/suspicious/noArrayIndexKey: 조각에는 id가 없다
    <NodeView key={`${index}:${node.type}`} node={node} ctx={ctx} />
  ))
}

function NodeView({ node, ctx }: { node: FormNode; ctx: Context }) {
  switch (node.type) {
    case 'br':
      return <br />
    case 'text':
      return (
        <span className={cn(node.tone === 'guide' && 'text-muted-foreground print:text-black/60')}>
          {node.text}
        </span>
      )
    case 'info':
      return (
        <FieldButton ctx={ctx} id={node.field} inline tone="admin" label="사안 정보">
          <span className="border-b border-dashed border-black/50 print:border-0">{node.text}</span>
        </FieldButton>
      )
    case 'field':
      return <FieldNode node={node} ctx={ctx} />
    case 'choice':
      return <ChoiceNode node={node} ctx={ctx} />
  }
}

type Tone = 'ai' | 'admin' | 'judge'

/** 칸 처리 방식 → 화면 구분. 칸이 없으면(초안 전) 판단 칸처럼 보인다. */
const toneOf = (field: DocumentField | undefined): Tone => {
  if (field?.kind === 'narrative') return 'ai'
  if (field?.kind === 'admin') return 'admin'
  return 'judge'
}

/** 인쇄물에는 색 표시를 빼고 모두 검정으로 인쇄한다. */
const TONE_TEXT: Record<Tone, string> = {
  ai: 'text-ai print:text-black',
  admin: 'text-black',
  judge: 'text-judge print:text-black',
}

const TONE_HOVER: Record<Tone, string> = {
  ai: 'hover:bg-ai-soft',
  admin: 'hover:bg-muted',
  judge: 'hover:bg-judge-soft',
}

function FieldButton({
  ctx,
  id,
  tone,
  inline,
  label,
  children,
}: {
  ctx: Context
  id: string
  tone: Tone
  inline?: boolean
  /** 스크린리더용 칸 이름 */
  label: string
  children: ReactNode
}) {
  const selected = ctx.selectedFieldId === id
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={() => ctx.onSelectField(id)}
      className={cn(
        'rounded-sm text-left align-baseline transition-colors',
        inline ? 'inline' : 'block w-full',
        TONE_HOVER[tone],
        selected && 'ring-2 ring-primary print:ring-0',
      )}
    >
      {children}
    </button>
  )
}

/** 사안 정보에서 가져온 칸에 다는 표시 */
function InfoChip() {
  return (
    <span className="ml-1 rounded bg-muted px-1 py-px align-middle text-[10px] font-normal text-muted-foreground print:hidden">
      사안 정보에서 가져옴
    </span>
  )
}

function FieldNode({ node, ctx }: { node: Extract<FormNode, { type: 'field' }>; ctx: Context }) {
  const field = ctx.fieldsById.get(node.id)
  const tone = toneOf(field)
  const label = field?.label ?? node.id
  const empty = !field || field.value === ''

  const editor = editorFor(ctx, field)
  if (editor) return editor

  if (tone === 'judge' && empty) {
    // 판단 칸은 비어 있다. 점선 주황 칸으로 「여기를 채워야 한다」를 보인다.
    return (
      <FieldButton ctx={ctx} id={node.id} tone={tone} inline={node.inline} label={label}>
        <span className="inline-block min-h-5 min-w-16 rounded-sm border border-dashed border-judge/60 bg-judge-soft/50 px-1 align-middle text-xs text-judge/80 print:rounded-none print:border-0 print:border-b print:border-solid print:border-black/60 print:bg-transparent print:text-transparent">
          {node.placeholder ?? '판단·입력 칸'}
        </span>
      </FieldButton>
    )
  }

  return (
    <FieldButton ctx={ctx} id={node.id} tone={tone} inline={node.inline} label={label}>
      {tone === 'admin' && empty ? (
        <span className="text-xs text-muted-foreground italic print:invisible">
          사안 정보에서 입력해 주세요
        </span>
      ) : (
        <span
          className={cn(
            'whitespace-pre-line',
            TONE_TEXT[tone],
            tone === 'admin' && 'border-b border-dashed border-black/50 print:border-0',
          )}
        >
          {field?.value}
        </span>
      )}
      {tone === 'admin' && <InfoChip />}
      {tone === 'ai' && field && field.evidence.length > 0 && (
        <span className="ml-1 rounded bg-ai-soft px-1 py-px align-middle text-[10px] font-normal text-ai print:hidden">
          근거 {field.evidence.length}
        </span>
      )}
      {tone === 'ai' && field?.reviewed && (
        <span className="ml-1 rounded bg-success-soft px-1 py-px align-middle text-[10px] font-normal text-success-strong">
          검토함
        </span>
      )}
      {field?.edited && (
        <span className="ml-1 rounded bg-judge-soft px-1 py-px align-middle text-[10px] font-normal text-judge print:hidden">
          교사 수정
        </span>
      )}
    </FieldButton>
  )
}

function ChoiceNode({ node, ctx }: { node: Extract<FormNode, { type: 'choice' }>; ctx: Context }) {
  const field = ctx.fieldsById.get(node.id)
  const tone = toneOf(field)
  const checked = parseChoice(field?.value ?? '')
  const mark = node.mark ?? 'box'
  const inline = node.direction === 'inline'
  const empty = checked.length === 0
  const outlined = tone === 'judge' && empty

  const editor = editorFor(ctx, field)
  if (editor) return editor

  return (
    <FieldButton ctx={ctx} id={node.id} tone={tone} label={field?.label ?? node.id}>
      <span
        className={cn(
          'block rounded-sm',
          outlined &&
            'border border-dashed border-judge/60 bg-judge-soft/40 px-1 print:border-0 print:bg-transparent print:px-0',
        )}
      >
        {node.options.map((option) => {
          const on = checked.includes(option.id)
          return (
            <span key={option.id} className={cn(inline ? 'mr-4 inline-block' : 'block', 'py-px')}>
              {mark === 'box' ? (
                <>
                  <span className={cn(on ? TONE_TEXT[tone] : 'text-black/70')}>
                    {on ? '■' : '□'}
                  </span>{' '}
                  {option.label}
                </>
              ) : (
                <>
                  {option.label} (
                  <span className={cn('inline-block w-4 text-center', TONE_TEXT[tone])}>
                    {on ? '√' : ''}
                  </span>
                  )
                </>
              )}
              {option.detail?.map((line) => (
                <span key={line} className="block pl-3 text-[12px] text-muted-foreground">
                  - {line}
                </span>
              ))}
            </span>
          )
        })}
        {tone === 'admin' && <InfoChip />}
        {tone === 'ai' && field && field.evidence.length > 0 && (
          <span className="rounded bg-ai-soft px-1 py-px align-middle text-[10px] text-ai print:hidden">
            근거 {field.evidence.length}
          </span>
        )}
      </span>
    </FieldButton>
  )
}
