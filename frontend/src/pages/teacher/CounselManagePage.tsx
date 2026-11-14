import { TeacherCounselList } from '@/components/counsel/TeacherCounselList.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'

/** 교사 「개인상담 관리」 목록. 시드 개인상담 건과 전환·종료된 AI 챗봇 상담 건이 최신순으로 함께 보인다. */
function CounselManagePage() {
  return (
    <>
      <PageHeader
        title="개인상담 관리"
        description="학생·보호자가 선생님께 상담을 신청하거나, 선생님이 학생/보호자에게 상담을 요청할 수 있어요."
      />
      <PageBody>
        <TeacherCounselList />
      </PageBody>
    </>
  )
}

export default CounselManagePage
