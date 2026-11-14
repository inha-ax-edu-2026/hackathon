import { Link, useSearchParams } from 'react-router'
import { useSchoolViolenceCases } from '@/api/schoolViolence.ts'
import { TeacherCounselList } from '@/components/counsel/TeacherCounselList.tsx'
import { SchoolViolenceCaseTable } from '@/components/schoolViolence/SchoolViolenceCaseTable.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx'
import { SCHOOL_VIOLENCE_PATH } from '@/lib/schoolViolence/paths.ts'

const TAB_TRIGGER =
  'flex-none px-1 data-[state=active]:text-primary after:bottom-[-1px] after:bg-primary'

function SchoolViolenceCases() {
  const { data: cases, isPending, isError } = useSchoolViolenceCases()

  if (isPending) {
    return <p className="py-12 text-center text-muted-foreground">불러오는 중이에요…</p>
  }
  if (isError) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        사안 목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.
      </p>
    )
  }
  if (cases.length === 0) {
    return (
      <section className="rounded-xl border bg-card px-6 py-16 text-center">
        <p className="font-medium">접수된 학교폭력 사안이 없어요.</p>
        <p className="mt-2 text-muted-foreground">
          <Link to={SCHOOL_VIOLENCE_PATH} className="text-primary underline underline-offset-2">
            학폭 상담 관리
          </Link>
          에서 상담 건을 열고 「상담 요약」의 「학폭 사안으로 접수」를 눌러 주세요.
        </p>
      </section>
    )
  }

  return <SchoolViolenceCaseTable cases={cases} />
}

/** 교사 학폭 메뉴(`/teacher/school-violence`). 상담과 접수한 사안을 탭으로 구분한다. */
function SchoolViolenceListPage() {
  const [params, setParams] = useSearchParams()
  const activeTab = params.get('tab') === 'cases' ? 'cases' : 'counsel'

  const selectTab = (tab: string) =>
    setParams((current) => {
      if (tab === 'cases') current.set('tab', tab)
      else current.delete('tab')
      return current
    })

  return (
    <>
      <PageHeader
        title="학교폭력 관리"
        description={
          activeTab === 'cases'
            ? '접수한 사안의 처리 단계와 서류 진행 상황을 한눈에 볼 수 있어요.'
            : '학교폭력 관련 상담을 확인하고 관리할 수 있어요.'
        }
      />
      <PageBody>
        <Tabs
          value={activeTab}
          onValueChange={selectTab}
          activationMode="manual"
          className="gap-[18px]"
        >
          <TabsList
            aria-label="학교폭력 관리"
            variant="line"
            className="h-10 w-full justify-start gap-4 border-b px-0 sm:gap-6"
          >
            <TabsTrigger value="counsel" className={TAB_TRIGGER}>
              학폭 상담 관리
            </TabsTrigger>
            <TabsTrigger value="cases" className={TAB_TRIGGER}>
              학폭으로 넘어간 사안 관리
            </TabsTrigger>
          </TabsList>
          <TabsContent value="counsel">
            <TeacherCounselList />
          </TabsContent>
          <TabsContent value="cases">
            <SchoolViolenceCases />
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  )
}

export default SchoolViolenceListPage
