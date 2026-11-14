import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'

function CounselRegisterPage() {
  return (
    <>
      <PageHeader title="개인상담 신청" description="선생님께 대면·화상·전화 상담을 신청해요." />
      <PageBody>
        <section className="rounded-xl border bg-card px-6 py-16 text-center text-muted-foreground">
          개인상담 신청은 슈퍼스쿨의 기존 화면을 이용해요.
        </section>
      </PageBody>
    </>
  )
}

export default CounselRegisterPage
