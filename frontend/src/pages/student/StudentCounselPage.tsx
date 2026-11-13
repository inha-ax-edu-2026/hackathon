import { ComingSoon } from '@/components/shell/ComingSoon.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'

/** 학생 「내 상담」 목록 + 상담 방식 선택 창. 04번 티켓에서 채운다. */
function StudentCounselPage() {
  return (
    <>
      <PageHeader title="내 상담" description="선생님과 나눈 상담과 신청한 상담을 확인해요." />
      <PageBody>
        <ComingSoon />
      </PageBody>
    </>
  )
}

export default StudentCounselPage
