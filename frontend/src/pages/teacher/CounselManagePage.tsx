import { useTeacherCases } from '@/api/teacherCounsel.ts'
import { TeacherCaseTable } from '@/components/consult/TeacherCaseTable.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'

/** 교사 「개인상담 관리」 목록. 시드 개인상담 건과 전환·종료된 AI 챗봇 상담 건이 최신순으로 함께 보인다. */
function CounselManagePage() {
  const { data: cases, isPending, isError } = useTeacherCases()

  return (
    <>
      <PageHeader
        title="개인상담 관리"
        description="학생·보호자가 선생님께 상담을 신청하거나, 선생님이 학생/보호자에게 상담을 요청할 수 있어요."
      />
      <PageBody>
        {isPending ? (
          <p className="py-12 text-center text-muted-foreground">불러오는 중이에요…</p>
        ) : isError ? (
          <p className="py-12 text-center text-muted-foreground">
            상담 목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.
          </p>
        ) : cases.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">상담 내역이 없어요.</p>
        ) : (
          <TeacherCaseTable cases={cases} />
        )}
      </PageBody>
    </>
  )
}

export default CounselManagePage
