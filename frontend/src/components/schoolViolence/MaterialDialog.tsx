import type { SchoolViolenceMaterial } from '@/api/schoolViolenceTypes.ts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx'
import { MATERIAL_KIND_LABEL } from '@/lib/schoolViolence/labels.ts'

type MaterialDialogProps = {
  /** 열 사안 자료. null이면 닫혀 있다. */
  material: SchoolViolenceMaterial | null
  /** 원문에서 강조할 인용문. 있으면 그 자리로 스크롤한다. */
  highlight?: string
  onClose: () => void
}

/** 사안 자료 원문 보기. 근거 인용에서 넘어오면 인용문을 강조하고 그 자리로 스크롤한다. */
export function MaterialDialog({ material, highlight, onClose }: MaterialDialogProps) {
  return (
    <Dialog open={material !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85svh] grid-rows-[auto_minmax(0,1fr)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{material?.title}</DialogTitle>
          <DialogDescription>
            {material && MATERIAL_KIND_LABEL[material.kind]} 원문 · 가상 사례
          </DialogDescription>
        </DialogHeader>
        <pre className="min-h-0 overflow-y-auto rounded-lg bg-muted/50 p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap">
          {material && <Body body={material.body} highlight={highlight} />}
        </pre>
      </DialogContent>
    </Dialog>
  )
}

function Body({ body, highlight }: { body: string; highlight?: string }) {
  const start = highlight ? body.indexOf(highlight) : -1
  if (!highlight || start < 0) return body
  return (
    <>
      {body.slice(0, start)}
      <mark
        ref={(element) => element?.scrollIntoView({ block: 'center' })}
        className="rounded-sm bg-ai-soft px-0.5 text-ai"
      >
        {highlight}
      </mark>
      {body.slice(start + highlight.length)}
    </>
  )
}
