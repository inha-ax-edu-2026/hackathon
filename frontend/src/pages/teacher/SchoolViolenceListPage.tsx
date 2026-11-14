import { Link } from 'react-router'
import { useSchoolViolenceCases } from '@/api/schoolViolence.ts'
import { SchoolViolenceCaseTable } from '@/components/schoolViolence/SchoolViolenceCaseTable.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'
import { TEACHER_COUNSEL_PATH } from '@/lib/counsel/paths.ts'

/** 교사 「학교폭력 사안」 목록(`/teacher/school-violence`). 접수한 사안이 최근 순으로 보인다. */
function SchoolViolenceListPage() {
  const { data: cases, isPending, isError } = useSchoolViolenceCases()

  return (
    <>
      <PageHeader
        title="학교폭력 사안"
        description="접수한 사안의 처리 단계와 서류 진행 상황을 한눈에 볼 수 있어요."
      />
      <PageBody>
        {isPending ? (
          <p className="py-12 text-center text-muted-foreground">불러오는 중이에요…</p>
        ) : isError ? (
          <p className="py-12 text-center text-muted-foreground">
            사안 목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.
          </p>
        ) : cases.length === 0 ? (
          <section className="rounded-xl border bg-card px-6 py-16 text-center">
            <p className="font-medium">접수된 학교폭력 사안이 없어요.</p>
            <p className="mt-2 text-muted-foreground">
              <Link to={TEACHER_COUNSEL_PATH} className="text-primary underline underline-offset-2">
                개인상담 관리
              </Link>
              의 상담 건 상세 「사후 서류」 탭에서 「학폭 사안으로 접수」해 주세요. 사안은 상담
              건에서 접수할 수 있어요.
            </p>
          </section>
        ) : (
          <SchoolViolenceCaseTable cases={cases} />
        )}
      </PageBody>
    </>
  )
}

export default SchoolViolenceListPage
