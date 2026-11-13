import { ChevronLeft } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router'
import { useApproveCase, useMarkCaseRead, useTeacherCaseDetail } from '@/api/teacherCounsel.ts'
import { RiskBadge, StatusBadge } from '@/components/counsel/CaseBadges.tsx'
import { DocumentsSlot } from '@/components/counsel/detail/DocumentsSlot.tsx'
import { FormCard } from '@/components/counsel/detail/FormCard.tsx'
import { SummaryCard } from '@/components/counsel/detail/SummaryCard.tsx'
import { SuperschoolCards } from '@/components/counsel/detail/SuperschoolCards.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'
import { Button } from '@/components/ui/button.tsx'
import { ApiError } from '@/lib/api.ts'
import { HANDOFF_REASON_LABEL } from '@/lib/counsel/labels.ts'

const LIST_PATH = '/teacher/manage-apply/counsel'

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const detail = (error.body as { detail?: unknown } | null)?.detail
    if (typeof detail === 'string') return detail
  }
  return '잠시 후 다시 시도해 주세요.'
}

const backLink = (
  <Link to={LIST_PATH} className="inline-flex items-center gap-1">
    <ChevronLeft className="size-4" />
    목록으로 돌아가기
  </Link>
)

/** 상담 건 상세(`/teacher/manage-apply/counsel/:id`). 대화 전문은 어디에도 보이지 않는다. */
function CounselDetailPage() {
  const { id = '' } = useParams()
  const { data, isPending, error } = useTeacherCaseDetail(id)
  const markRead = useMarkCaseRead()
  const approve = useApproveCase()

  // 상세를 열면 읽음 처리한다(건마다 한 번).
  const markedRef = useRef(new Set<string>())
  const needsRead = data ? !data.case.read : false
  const { mutate: mutateRead } = markRead
  useEffect(() => {
    if (needsRead && !markedRef.current.has(id)) {
      markedRef.current.add(id)
      mutateRead(id)
    }
  }, [needsRead, id, mutateRead])

  if (isPending) {
    return (
      <>
        <PageHeader back={backLink} title="상담 상세" />
        <PageBody>
          <p className="text-muted-foreground">불러오는 중이에요.</p>
        </PageBody>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <PageHeader back={backLink} title="상담 상세" />
        <PageBody>
          <section className="rounded-xl border bg-card px-6 py-16 text-center text-muted-foreground">
            {error instanceof ApiError && error.status === 404
              ? '상담 건을 찾을 수 없어요.'
              : '상담 건을 불러오지 못했어요.'}
          </section>
        </PageBody>
      </>
    )
  }

  const { case: counsel, summary, form, documents } = data
  const handoff = counsel.handoff

  return (
    <>
      <PageHeader
        back={backLink}
        title={counsel.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge status={counsel.status} />
            {counsel.risk && <RiskBadge risk={counsel.risk} />}
            {handoff && (
              <span className="text-secondary-foreground">
                전환 사유 · {HANDOFF_REASON_LABEL[handoff.reason]}
              </span>
            )}
          </span>
        }
        actions={
          counsel.status === 'awaiting_approval' && (
            <Button disabled={approve.isPending} onClick={() => approve.mutate(id)}>
              상담 승인
            </Button>
          )
        }
      />
      <PageBody>
        {approve.isError && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(approve.error)}
          </p>
        )}
        {summary && <SummaryCard summary={summary} keywords={counsel.detected_keywords} />}
        {form && <FormCard form={form} />}
        {documents && <DocumentsSlot caseId={id} documents={documents} />}
        <SuperschoolCards counsel={counsel} form={form} />
      </PageBody>
    </>
  )
}

export default CounselDetailPage
