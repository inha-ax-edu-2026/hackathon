import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { DocItem } from '@/lib/consult/model'
import { cn } from '@/lib/utils'

type DocCardProps = {
  doc: DocItem
  approved: boolean
  onApprove: () => void
  onEdit: (text: string) => void
}

/** 자동 생성된 서류 초안 한 장. 교사가 고치고 승인한다. 선택되지 않은 서류는 제외 사유만 보여준다. */
export function DocCard({ doc, approved, onApprove, onEdit }: DocCardProps) {
  if (!doc.selected) {
    return (
      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        <b>{doc.title}</b> — 제외 · {doc.reason}
      </div>
    )
  }
  return (
    <div
      className={cn(
        'space-y-2 rounded-lg border p-3',
        approved && 'border-success bg-success-soft/40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{doc.title}</p>
          <p className="text-xs text-muted-foreground">
            {doc.audience} · {doc.reason}
          </p>
        </div>
        <Button
          size="sm"
          variant={approved ? 'default' : 'outline'}
          className={cn(approved && 'bg-success hover:bg-success/90')}
          onClick={onApprove}
        >
          {approved ? '승인됨' : '검토 완료'}
        </Button>
      </div>
      <Textarea
        rows={6}
        className="font-mono text-xs"
        value={doc.text}
        onChange={(e) => onEdit(e.target.value)}
      />
    </div>
  )
}
