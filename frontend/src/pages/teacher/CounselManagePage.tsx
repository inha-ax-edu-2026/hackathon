import { ComingSoon } from '@/components/shell/ComingSoon.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'

/** 교사 「개인상담 관리」 목록. 07번 티켓에서 채운다. */
function CounselManagePage() {
  return (
    <>
      <PageHeader
        title="개인상담 관리"
        description="학생·보호자가 선생님께 상담을 신청하거나, 선생님이 학생/보호자에게 상담을 요청할 수 있어요."
      />
      <PageBody>
        <ComingSoon />
      </PageBody>
    </>
  )
}

export default CounselManagePage
