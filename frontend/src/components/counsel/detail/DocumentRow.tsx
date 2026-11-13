import { Check } from 'lucide-react'
import { useState } from 'react'
import type { CounselDocument, DocumentKind } from '@/api/counselTypes.ts'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Checkbox } from '@/components/ui/checkbox.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'

type DocumentRowProps = {
  doc: CounselDocument
  /** 저장하지 않은 초안 수정. 없으면 서버 초안을 그대로 보인다. */
  edit: string | undefined
  onEdit: (text: string | undefined) => void
  onSelect: (selected: boolean) => void
  onSaveDraft: (draft: string) => Promise<unknown>
  onApprove: (kind: DocumentKind) => Promise<unknown>
}

/** 서류 한 줄: 선택 체크, 받는 대상·추천 근거, 선택했으면 초안 편집기. */
export function DocumentRow({
  doc,
  edit,
  onEdit,
  onSelect,
  onSaveDraft,
  onApprove,
}: DocumentRowProps) {
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
