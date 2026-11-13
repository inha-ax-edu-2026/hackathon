import { ComingSoon } from '@/components/shell/ComingSoon.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'

/** AI 챗봇 상담(`/student/counsel/chatbot/:id`). 05번 티켓에서 채운다. */
function ChatbotChatPage() {
  return (
    <>
      <PageHeader title="AI 챗봇 상담" />
      <PageBody>
        <ComingSoon />
      </PageBody>
    </>
  )
}

export default ChatbotChatPage
