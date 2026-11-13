import { ComingSoon } from '@/components/shell/ComingSoon.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'

/** 슈퍼스쿨 개인상담 신청 화면 재현. 경로만 확보한다(우선순위 최하위). */
function CounselRegisterPage() {
  return (
    <>
      <PageHeader title="개인상담 신청" description="선생님께 대면·화상·전화 상담을 신청해요." />
      <PageBody>
        <ComingSoon>개인상담 신청은 슈퍼스쿨의 기존 화면을 이용해요.</ComingSoon>
      </PageBody>
    </>
  )
}

export default CounselRegisterPage
