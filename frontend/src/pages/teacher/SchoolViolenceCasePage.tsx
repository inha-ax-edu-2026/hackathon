import { ChevronLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { useSchoolViolenceCase } from '@/api/schoolViolence.ts'
import { CaseInfoCard } from '@/components/schoolViolence/CaseInfoCard.tsx'
import { DocumentChecklist } from '@/components/schoolViolence/DocumentChecklist.tsx'
import { MaterialsCard } from '@/components/schoolViolence/MaterialsCard.tsx'
import { VirtualCaseBanner } from '@/components/schoolViolence/VirtualCaseBanner.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { ApiError } from '@/lib/api.ts'
import { STAGE_LABEL } from '@/lib/schoolViolence/labels.ts'
import { SCHOOL_VIOLENCE_PATH } from '@/lib/schoolViolence/paths.ts'

/** 사안 페이지(`/teacher/school-violence/:id`): 사안 정보, 사안 자료, 공통 단계 서류 9종. */
function SchoolViolenceCasePage() {
  const { id = '' } = useParams()
  const { data, isPending, error } = useSchoolViolenceCase(id)

  const backLink = (
    <Link to={SCHOOL_VIOLENCE_PATH} className="inline-flex items-center gap-1">
      <ChevronLeft className="size-4" />
      사안 목록으로 돌아가기
    </Link>
  )

  if (isPending) {
    return (
      <>
        <PageHeader back={backLink} title="학교폭력 사안" />
        <PageBody>
          <p className="text-muted-foreground">불러오는 중이에요.</p>
        </PageBody>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <PageHeader back={backLink} title="학교폭력 사안" />
        <PageBody>
          <section className="rounded-xl border bg-card px-6 py-16 text-center text-muted-foreground">
            {error instanceof ApiError && error.status === 404
              ? '사안을 찾을 수 없어요. 시연 초기화 뒤에는 상담 건에서 다시 접수해 주세요.'
              : '사안을 불러오지 못했어요.'}
          </section>
        </PageBody>
      </>
    )
  }

  const { info, materials, documents, stage, progress } = data

  return (
    <>
      <PageHeader
        back={backLink}
        title={`학교폭력 사안 ${info.case_number}호`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge className="bg-primary-soft text-primary">{STAGE_LABEL[stage]} 단계</Badge>
            <span className="text-secondary-foreground">
              {info.school_name} · 관련 학생 {info.students.length}명 · 서류 {progress.approved}/
              {progress.total} 승인
            </span>
          </span>
        }
      />
      <PageBody>
        <VirtualCaseBanner />
        <div className="grid items-start gap-[18px] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-[18px]">
            <CaseInfoCard caseId={data.id} info={info} />
            <MaterialsCard materials={materials} />
          </div>
          <DocumentChecklist caseId={data.id} documents={documents} />
        </div>
      </PageBody>
    </>
  )
}

export default SchoolViolenceCasePage
