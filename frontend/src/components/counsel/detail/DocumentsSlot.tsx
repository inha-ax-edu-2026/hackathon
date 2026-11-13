import { Check, FolderOpen, Loader2, Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CaseDocuments, CounselDocument, DocumentKind } from '@/api/counselTypes.ts'
import { useApproveDocument, useUpdateDocument } from '@/api/teacherCounsel.ts'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Checkbox } from '@/components/ui/checkbox.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'
import { ApiError } from '@/lib/api.ts'
import { cn } from '@/lib/utils.ts'
import { DetailCard } from './DetailCard.tsx'
import {
  finalStepIndex,
  hasSeenDocuments,
  markDocumentsSeen,
  PIPELINE_STEPS,
  type StepState,
  stepStates,
} from './documentPipeline.ts'

type DocumentsSlotProps = {
  caseId: string
  /** 상세 응답의 서류. 전환된 건에만 있다. */
  documents: CaseDocuments
}

const STEP_INTERVAL_MS = 450

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const detail = (error.body as { detail?: unknown } | null)?.detail
    if (typeof detail === 'string') return detail
  }
  return '잠시 후 다시 시도해 주세요.'
}

/**
 * ④ 사후 서류 카드: 진행 표시, 서류 4종 선택, 선택한 서류의 초안 수정·「검토 완료」, 절감 시간.
 * 선택·수정·승인은 서류 PATCH/approve로 저장되고, 응답이 상세 캐시를 바로 갱신한다.
 */
export function DocumentsSlot({ caseId, documents }: DocumentsSlotProps) {
  // 건이 바뀌면 진행 애니메이션·편집 상태도 새로 시작한다.
  return <DocumentsCard key={caseId} caseId={caseId} documents={documents} />
}

function DocumentsCard({ caseId, documents }: DocumentsSlotProps) {
  // 저장하지 않은 초안 수정은 서류 종류별로 카드가 들고 있다. 체크를 뺐다가 다시 넣어도 남는다.
  const [edits, setEdits] = useState<Partial<Record<DocumentKind, string>>>({})
  const setEdit = (kind: DocumentKind, text: string | undefined) =>
    setEdits(({ [kind]: _, ...rest }) => (text === undefined ? rest : { ...rest, [kind]: text }))
  const update = useUpdateDocument(caseId)
  const approve = useApproveDocument(caseId)
  const error = update.error ?? approve.error

  return (
    <DetailCard
      title="사후 서류"
      icon={<FolderOpen className="size-4 text-muted-foreground" />}
      aside={
        documents.all_approved && (
          <Badge className="bg-success-soft text-success-strong">
            <Check /> 승인 완료
          </Badge>
        )
      }
    >
      <div className="space-y-5">
        <PipelineProgress caseId={caseId} allApproved={documents.all_approved} />
        <SavedMinutes documents={documents} />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(error)}
          </p>
        )}
        <ul className="divide-y rounded-lg border">
          {documents.items.map((doc) => (
            <DocumentRow
              key={doc.kind}
              doc={doc}
              edit={edits[doc.kind]}
              onEdit={(text) => setEdit(doc.kind, text)}
              onSelect={(selected) => update.mutate({ kind: doc.kind, selected })}
              onSaveDraft={(draft) => update.mutateAsync({ kind: doc.kind, draft })}
              onApprove={(kind) => approve.mutateAsync(kind)}
            />
          ))}
        </ul>
      </div>
    </DetailCard>
  )
}

/** 데이터 수집 → … → 승인 완료. 이 건을 처음 열 때만 한 번 짧게 움직이고, 다시 열면 바로 결과 상태다. */
function PipelineProgress({ caseId, allApproved }: { caseId: string; allApproved: boolean }) {
  const target = finalStepIndex(allApproved)
  // 처음 연 건이면 0단계부터 목표까지 차례로 올라간다. 이후에는 곧바로 결과 상태.
  const [animating] = useState(() => !hasSeenDocuments(caseId))
  const [shown, setShown] = useState(animating ? 0 : target)

  // 열자마자 "봤다"고 기록한다. 애니메이션 도중에 나갔다 와도 다시 돌지 않는다.
  useEffect(() => {
    if (animating) markDocumentsSeen(caseId)
  }, [animating, caseId])

  useEffect(() => {
    if (!animating || shown >= target) return
    const timer = setTimeout(() => setShown(shown + 1), STEP_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [animating, shown, target])

  // 애니메이션이 끝난 뒤에는 승인 상태가 바뀌는 대로 목표 단계를 따라간다.
  const current = animating && shown < target ? shown : target
  const states = stepStates(current)

  return (
    <ol aria-label="서류 준비 단계" className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {PIPELINE_STEPS.map((label, index) => (
        <li key={label} className="flex items-center gap-1">
          <StepChip label={label} state={states[index]} spinning={animating && shown < target} />
          {index < PIPELINE_STEPS.length - 1 && <span className="text-border">—</span>}
        </li>
      ))}
    </ol>
  )
}

function StepChip({
  label,
  state,
  spinning,
}: {
  label: string
  state: StepState
  /** 처음 열어 단계가 움직이는 동안만 돈다. 결과 상태의 「검토 대기」는 멈춰 있다. */
  spinning: boolean
}) {
  return (
    <span
      data-state={state}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-300',
        state === 'done' && 'border-success bg-success-soft text-success-strong',
        state === 'active' && 'border-primary bg-primary-soft text-primary',
        state === 'pending' && 'border-border text-muted-foreground',
      )}
    >
      {state === 'done' && <Check className="size-3" />}
      {state === 'active' && <Loader2 className={cn('size-3', spinning && 'animate-spin')} />}
      {label}
    </span>
  )
}

/** 절감 수치는 서버가 센 값을 그대로 보인다. 근거가 가정치라는 점도 숨기지 않는다. */
function SavedMinutes({ documents }: { documents: CaseDocuments }) {
  const { saved_minutes, manual_minutes_per_document, review_minutes_per_document } = documents
  const hasSelected = documents.items.some((doc) => doc.selected)
  return (
    <div className="flex items-center gap-3 rounded-lg bg-primary-soft/50 px-4 py-3">
      <Timer className="size-5 shrink-0 text-primary" />
      {hasSelected ? (
        <p>
          <strong className="text-lg font-semibold text-primary">약 {saved_minutes}분 절감</strong>
          <span className="ml-2 text-secondary-foreground">
            · 직접 작성 {manual_minutes_per_document}분 → 검토 {review_minutes_per_document}분
            기준(가정)
          </span>
        </p>
      ) : (
        <p className="text-secondary-foreground">서류를 선택하면 절감되는 시간을 계산해 드려요.</p>
      )}
    </div>
  )
}

type DocumentRowProps = {
  doc: CounselDocument
  /** 저장하지 않은 초안 수정. 없으면 서버 초안을 그대로 보인다. */
  edit: string | undefined
  onEdit: (text: string | undefined) => void
  onSelect: (selected: boolean) => void
  onSaveDraft: (draft: string) => Promise<unknown>
  onApprove: (kind: DocumentKind) => Promise<unknown>
}

function DocumentRow({ doc, edit, onEdit, onSelect, onSaveDraft, onApprove }: DocumentRowProps) {
  const id = `document-${doc.kind}`
  return (
    <li className="p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={doc.selected}
          onCheckedChange={(checked) => onSelect(checked === true)}
          className="mt-1"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={id} className="cursor-pointer font-medium">
              {doc.title}
            </label>
            <Badge variant="outline" className="text-secondary-foreground">
              {doc.audience}
            </Badge>
            {doc.recommended && <Badge className="bg-primary-soft text-primary">추천</Badge>}
            {doc.selected && doc.approved && (
              <Badge className="bg-success-soft text-success-strong">
                <Check /> 검토 완료
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{doc.recommend_reason}</p>
          {doc.selected && (
            <DraftEditor
              doc={doc}
              edit={edit}
              onEdit={onEdit}
              onSave={onSaveDraft}
              onApprove={onApprove}
            />
          )}
        </div>
      </div>
    </li>
  )
}

type DraftEditorProps = {
  doc: CounselDocument
  edit: string | undefined
  onEdit: (text: string | undefined) => void
  onSave: (draft: string) => Promise<unknown>
  onApprove: (kind: DocumentKind) => Promise<unknown>
}

/**
 * 초안 편집기. 고치는 글(`edit`)은 카드가 들고 있다가 「저장」할 때만 서버에 보낸다.
 * 고치던 글이 없으면 서버 초안(저장 응답·다른 탭·폴링)을 그대로 따라가고, 있으면 덮어쓰지 않는다.
 */
function DraftEditor({ doc, edit, onEdit, onSave, onApprove }: DraftEditorProps) {
  const [busy, setBusy] = useState(false)
  const text = edit ?? doc.draft
  const dirty = text !== doc.draft
  const empty = text.trim() === ''

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    try {
      await action()
    } catch {
      // 오류 문구는 카드 위쪽에서 mutation 상태로 보인다.
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <Textarea
        aria-label={`${doc.title} 초안`}
        value={text}
        onChange={(event) => onEdit(event.target.value)}
        className="min-h-40 leading-relaxed"
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        {dirty && (
          <span className="mr-auto text-sm text-warning-strong">저장하지 않은 수정이 있어요.</span>
        )}
        {dirty && (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => onEdit(undefined)}>
            되돌리기
          </Button>
        )}
        {dirty && (
          <Button
            variant="outline"
            size="sm"
            disabled={busy || empty}
            onClick={() =>
              run(async () => {
                await onSave(text)
                onEdit(undefined)
              })
            }
          >
            저장
          </Button>
        )}
        <Button
          size="sm"
          disabled={busy || empty || (doc.approved && !dirty)}
          // 고친 글이 있으면 저장한 뒤 승인한다(저장하면 승인이 풀리므로 순서가 중요하다).
          onClick={() =>
            run(async () => {
              if (dirty) {
                await onSave(text)
                onEdit(undefined)
              }
              await onApprove(doc.kind)
            })
          }
        >
          {doc.approved && !dirty ? '검토 완료됨' : '검토 완료'}
        </Button>
      </div>
    </div>
  )
}
