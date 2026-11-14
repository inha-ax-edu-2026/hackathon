import { ChevronLeft } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useLinkedSchoolViolenceCaseId } from '@/api/schoolViolence.ts'
import { useApproveCase, useMarkCaseRead, useTeacherCaseDetail } from '@/api/teacherCounsel.ts'
import { useBackendConnection } from '@/components/counsel/BackendConnection.tsx'
import { RiskBadge, StatusBadge } from '@/components/counsel/CaseBadges.tsx'
import { DocumentsSlot } from '@/components/counsel/detail/DocumentsSlot.tsx'
import { FormCard } from '@/components/counsel/detail/FormCard.tsx'
import { SummaryCard } from '@/components/counsel/detail/SummaryCard.tsx'
import { SuperschoolCards } from '@/components/counsel/detail/SuperschoolCards.tsx'
import { IntakeCard } from '@/components/schoolViolence/IntakeCard.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx'
import { ApiError } from '@/lib/api.ts'
import { HANDOFF_REASON_LABEL } from '@/lib/counsel/labels.ts'
import { TEACHER_COUNSEL_PATH } from '@/lib/counsel/paths.ts'
import { cn } from '@/lib/utils.ts'

/** 밑줄형 탭: 선택한 탭은 주색 글자와 밑줄. */
const TAB_TRIGGER =
  'flex-none px-1 text-[15px] data-[state=active]:text-primary after:bottom-[-1px] after:bg-primary'

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const detail = (error.body as { detail?: unknown } | null)?.detail
    if (typeof detail === 'string') return detail
  }
  return '잠시 후 다시 시도해 주세요.'
}

const TABS = ['summary', 'documents', 'info'] as const
type DetailTab = (typeof TABS)[number]

function isDetailTab(value: string | null): value is DetailTab {
  return TABS.includes(value as DetailTab)
}

/** 상담 건 상세(`/teacher/manage-apply/counsel/:id`). 대화 전문은 어디에도 보이지 않는다. */
function CounselDetailPage({ listPath = TEACHER_COUNSEL_PATH }: { listPath?: string }) {
  const { id = '' } = useParams()
  const connection = useBackendConnection()
  // 백엔드 상담 응답은 사안 접수를 모르지만, 사안 API는 목이 처리하므로 접수 카드를 보인다.
  const isBackend = connection.mode === 'backend'
  const linkedCaseId = useLinkedSchoolViolenceCaseId(id, isBackend)
  const { data, isPending, error } = useTeacherCaseDetail(id)
  const markRead = useMarkCaseRead()
  const approve = useApproveCase()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const backLink = (
    <Link to={listPath} className="inline-flex items-center gap-1">
      <ChevronLeft className="size-4" />
      목록으로 돌아가기
    </Link>
  )

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

  const {
    case: counsel,
    summary,
    form,
    documents,
    school_violence_case_id,
    school_violence_recommendation,
    school_violence_intake_supported,
  } = data
  const handoff = counsel.handoff

  // 선택한 탭은 `?tab=`에 둔다. 새로고침·링크로 들어와도 같은 탭이 열린다. 서류가 없는 건은 서류 탭이 없다.
  const tab: DetailTab =
    isDetailTab(tabParam) && (tabParam !== 'documents' || documents) ? tabParam : 'summary'
  const selectTab = (next: string) =>
    setSearchParams(
      (params) => {
        if (next === 'summary') params.delete('tab')
        else params.set('tab', next)
        return params
      },
      { replace: true },
    )
  const selectedDocs = documents?.items.filter((doc) => doc.selected) ?? []
  const approvedDocs = selectedDocs.filter((doc) => doc.approved)

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
            <Button
              disabled={approve.isPending}
              onClick={() =>
                approve.mutate(id, {
                  // 승인하면 바로 사후 서류 작성으로 이어진다.
                  onSuccess: () => documents && selectTab('documents'),
                })
              }
            >
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
        <Tabs value={tab} onValueChange={selectTab} className="gap-[18px]">
          <TabsList variant="line" className="h-10 w-full justify-start gap-6 border-b px-0">
            <TabsTrigger value="summary" className={TAB_TRIGGER}>
              상담 요약
            </TabsTrigger>
            {documents && (
              <TabsTrigger value="documents" className={TAB_TRIGGER}>
                사후 서류
                {selectedDocs.length > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-xs tabular-nums',
                      documents.all_approved
                        ? 'bg-success-soft text-success-strong'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {approvedDocs.length}/{selectedDocs.length}
                  </span>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="info" className={TAB_TRIGGER}>
              기본 정보
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="flex flex-col gap-[18px]">
            {summary && <SummaryCard summary={summary} keywords={counsel.detected_keywords} />}
            {form && <FormCard form={form} />}
            {!summary && !form && (
              <section className="rounded-xl border bg-card px-6 py-16 text-center text-muted-foreground">
                아직 요약이나 상담 양식이 없어요.
              </section>
            )}
          </TabsContent>

          {documents && (
            // 탭을 옮겨도 저장 안 한 초안과 진행 표시가 남도록 숨기기만 한다.
            <TabsContent
              value="documents"
              forceMount
              className="flex flex-col gap-[18px] data-[state=inactive]:hidden"
            >
              {connection.mode === 'backend' && (
                <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-5">
                  <div>
                    <p className="font-semibold">학교폭력 서류 초안</p>
                    <p className="text-sm text-muted-foreground">
                      이전 상담·진술서·개별 면담으로 보고서 1-3·2-4를 작성해요. 별도 접속키 없이
                      작업실을 바로 열 수 있습니다.
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <a
                      href={`${connection.baseUrl}/document-demo?case_id=${encodeURIComponent(id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      서류 작업실 열기
                    </a>
                  </Button>
                </section>
              )}
              {(school_violence_intake_supported || isBackend) && (
                <IntakeCard
                  counselCaseId={id}
                  schoolViolenceCaseId={school_violence_case_id ?? linkedCaseId}
                  recommendation={school_violence_recommendation}
                />
              )}
              <DocumentsSlot caseId={id} documents={documents} />
            </TabsContent>
          )}

          <TabsContent value="info" className="flex flex-col gap-[18px]">
            <SuperschoolCards counsel={counsel} form={form} />
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  )
}

export default CounselDetailPage
