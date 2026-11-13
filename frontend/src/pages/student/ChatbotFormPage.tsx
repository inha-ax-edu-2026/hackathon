import { ComingSoon } from '@/components/shell/ComingSoon.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'

/** AI 챗봇 상담의 상담 양식 작성. 04번 티켓에서 채운다. */
function ChatbotFormPage() {
  return (
    <>
      <PageHeader
        title="AI 챗봇 상담 신청"
        description="상담 전에 상담 양식을 작성하면 바로 AI 챗봇과 이야기할 수 있어요."
      />
      <PageBody>
        <ComingSoon />
      </PageBody>
    </>
  )
}

export default ChatbotFormPage
