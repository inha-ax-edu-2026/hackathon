import { ChevronLeft } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useApproveCase, useMarkCaseRead, useTeacherCaseDetail } from '@/api/teacherCounsel.ts'
import { RiskBadge, StatusBadge } from '@/components/counsel/CaseBadges.tsx'
import { FormCard } from '@/components/counsel/detail/FormCard.tsx'
import { SummaryCard } from '@/components/counsel/detail/SummaryCard.tsx'
import { SuperschoolCards } from '@/components/counsel/detail/SuperschoolCards.tsx'
import { IntakeCard } from '@/components/schoolViolence/IntakeCard.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx'
import { ApiError } from '@/lib/api.ts'
import { HANDOFF_REASON_LABEL } from '@/lib/counsel/labels.ts'
import { SCHOOL_VIOLENCE_PATH } from '@/lib/schoolViolence/paths.ts'

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

/** 학폭 상담 상세. 대화 전문은 어디에도 보이지 않는다. */
function CounselDetailPage() {
  const { id = '' } = useParams()
  const { data, isPending, error } = useTeacherCaseDetail(id)
  const markRead = useMarkCaseRead()
  const approve = useApproveCase()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const backLink = (
    <Link to={SCHOOL_VIOLENCE_PATH} className="inline-flex items-center gap-1">
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
    school_violence_case_id,
    school_violence_recommendation,
    school_violence_intake_supported,
  } = data
  const handoff = counsel.handoff

  const tab = tabParam === 'info' ? 'info' : 'summary'
  const selectTab = (next: string) =>
    setSearchParams(
      (params) => {
        if (next === 'summary') params.delete('tab')
        else params.set('tab', next)
        return params
      },
      { replace: true },
    )

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
        <Tabs value={tab} onValueChange={selectTab} className="gap-[18px]">
          <TabsList variant="line" className="h-10 w-full justify-start gap-6 border-b px-0">
            <TabsTrigger value="summary" className={TAB_TRIGGER}>
              상담 요약
            </TabsTrigger>
            <TabsTrigger value="info" className={TAB_TRIGGER}>
              기본 정보
            </TabsTrigger>
          </TabsList>

          {/* 기본 정보 탭을 열어도 진행 중인 사안 접수의 결과를 처리한다. */}
          <TabsContent
            value="summary"
            forceMount
            className="flex flex-col gap-[18px] data-[state=inactive]:hidden"
          >
            {school_violence_intake_supported && (
              <IntakeCard
                key={id}
                counselCaseId={id}
                schoolViolenceCaseId={school_violence_case_id}
                recommendation={school_violence_recommendation}
              />
            )}
            {summary && <SummaryCard summary={summary} keywords={counsel.detected_keywords} />}
            {form && <FormCard form={form} />}
            {!summary && !form && (
              <section className="rounded-xl border bg-card px-6 py-16 text-center text-muted-foreground">
                아직 요약이나 상담 양식이 없어요.
              </section>
            )}
          </TabsContent>

          <TabsContent value="info" className="flex flex-col gap-[18px]">
            <SuperschoolCards counsel={counsel} form={form} />
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  )
}

export default CounselDetailPage
