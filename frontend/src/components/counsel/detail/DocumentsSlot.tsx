import { Check, FolderOpen } from 'lucide-react'
import { useState } from 'react'
import type { CaseDocuments, DocumentKind } from '@/api/counselTypes.ts'
import { useApproveDocument, useUpdateDocument } from '@/api/teacherCounsel.ts'
import { Badge } from '@/components/ui/badge.tsx'
import { ApiError } from '@/lib/api.ts'
import { DetailCard } from './DetailCard.tsx'
import { DocumentRow } from './DocumentRow.tsx'
import { PipelineProgress } from './PipelineProgress.tsx'
import { SavedMinutes } from './SavedMinutes.tsx'

type DocumentsSlotProps = {
  caseId: string
  /** 상세 응답의 서류. 전환된 건에만 있다. */
  documents: CaseDocuments
}

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
