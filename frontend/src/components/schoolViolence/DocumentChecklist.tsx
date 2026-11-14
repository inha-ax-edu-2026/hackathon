import { ListChecks, Lock } from 'lucide-react'
import { Link } from 'react-router'
import type { SchoolViolenceDocumentSummary } from '@/api/schoolViolenceTypes.ts'
import { DetailCard } from '@/components/counsel/detail/DetailCard.tsx'
import { EffectCounts, sumCounts } from '@/components/schoolViolence/EffectCounts.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { getFormLayout } from '@/lib/schoolViolence/forms/index.ts'
import { DOCUMENT_STATUS_LABEL, STAGE_LABEL, STAGES } from '@/lib/schoolViolence/labels.ts'
import { schoolViolenceDocumentPath } from '@/lib/schoolViolence/paths.ts'
import { cn } from '@/lib/utils.ts'

const STATUS_TONE = {
  none: 'bg-muted text-muted-foreground',
  reviewing: 'bg-warning-soft text-warning-strong',
  approved: 'bg-success-soft text-success-strong',
} as const

/** 공통 단계 서류 9종 체크리스트: 단계(접수·조사·심의)별로 작성 주체·결재·제출처·상태를 보인다. */
export function DocumentChecklist({
  caseId,
  documents,
}: {
  caseId: string
  documents: SchoolViolenceDocumentSummary[]
}) {
  const total = sumCounts(documents.map((doc) => doc.counts))
  return (
    <DetailCard
      title="공통 단계 서류 9종"
      icon={<ListChecks className="size-4 text-muted-foreground" />}
      aside={
        <span className="text-sm text-muted-foreground">이번 시연에서는 1-3과 2-4만 작성해요</span>
      }
    >
      <div className="space-y-5">
        {total.total > 0 && <EffectCounts counts={total} />}
        {STAGES.map((stage) => {
          const docs = documents.filter((doc) => doc.stage === stage)
          return (
            <section key={stage} aria-label={`${STAGE_LABEL[stage]} 단계`}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-secondary-foreground">
                <span className="rounded-md bg-primary-soft px-2 py-0.5 text-primary">
                  {STAGE_LABEL[stage]}
                </span>
                <span className="font-normal text-muted-foreground">{docs.length}종</span>
              </h3>
              <ul className="divide-y rounded-lg border">
                {docs.map((doc) => (
                  <DocumentRow key={doc.form_id} caseId={caseId} doc={doc} />
                ))}
              </ul>
            </section>
          )
        })}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        서식 번호·명칭은 교육부 「2026년 학교폭력 사안처리 가이드북」 부록1을 따라요. 실제 결재선은
        학교별 위임전결 규정에 따라 다를 수 있어요(예: 교감 전결).
      </p>
    </DetailCard>
  )
}

function DocumentRow({ caseId, doc }: { caseId: string; doc: SchoolViolenceDocumentSummary }) {
  // 양식 레이아웃이 있는 서류만 열 수 있다.
  const openable = doc.available && getFormLayout(doc.form_id) !== undefined
  // 작업할 수 있는 서류도 근거 자료가 없으면 잠긴다(2-4: 조사 자료). 서류는 열어서 이유를 볼 수 있다.
  const locked = doc.locked_reason !== null && doc.status === 'none'
  return (
    <li className={cn('px-4 py-3', !doc.available && 'bg-muted/40')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span
            className={cn(
              'shrink-0 font-semibold tabular-nums',
              doc.available ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {doc.form_id}
          </span>
          <span className={cn('font-medium', !doc.available && 'text-muted-foreground')}>
            {doc.name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {locked ? (
            <Badge variant="outline" className="text-muted-foreground">
              <Lock /> 조사 자료 필요
            </Badge>
          ) : doc.available ? (
            <Badge className={STATUS_TONE[doc.status]}>{DOCUMENT_STATUS_LABEL[doc.status]}</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              <Lock /> 시연 범위 밖
            </Badge>
          )}
        </div>
      </div>
      <dl className="mt-2 grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">작성 주체</dt>
        <dd>
          {doc.author}
          {doc.author_note && <span className="text-muted-foreground"> · {doc.author_note}</span>}
        </dd>
        <dt className="text-muted-foreground">결재·제출</dt>
        <dd>
          {doc.approval}
          {doc.approval_note && (
            <span className="text-muted-foreground"> · {doc.approval_note}</span>
          )}
        </dd>
      </dl>
      {doc.counts && (
        <p className="mt-2 text-xs text-muted-foreground">
          AI 작성 {doc.counts.ai}칸 / 전체 {doc.counts.total}칸 · 판단 칸{' '}
          {doc.counts.judgement_remaining}개 남음
        </p>
      )}
      {locked && <p className="mt-2 text-xs text-muted-foreground">{doc.locked_reason}</p>}
      {openable && !locked && (
        <div className="mt-3">
          <Button asChild size="sm" variant={doc.status === 'none' ? 'default' : 'outline'}>
            <Link to={schoolViolenceDocumentPath(caseId, doc.form_id)}>
              {doc.status === 'none' ? '열어서 AI 초안 만들기' : '서류 열기'}
            </Link>
          </Button>
        </div>
      )}
      {!doc.available && <p className="mt-2 text-xs text-muted-foreground">{doc.description}</p>}
    </li>
  )
}
