import { Plus } from 'lucide-react'
import { Link } from 'react-router'
import { CounselHistory } from '@/components/counsel/CounselHistory.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'
import { Button } from '@/components/ui/button.tsx'
import { useParentConversations } from '@/lib/counsel/parentConversations.ts'
import { PARENT_CHATBOT_NEW_PATH, parentChatbotPath } from '@/lib/counsel/paths.ts'

export default function ParentCounselPage() {
  const conversations = useParentConversations()

  return (
    <>
      <PageHeader
        title="학폭 상담"
        description="학교폭력 상담 내역을 확인해요."
        showConnection={false}
        actions={
          <Button size="lg" asChild>
            <Link to={PARENT_CHATBOT_NEW_PATH}>
              <Plus /> 상담하기
            </Link>
          </Button>
        }
      />
      <PageBody>
        <CounselHistory
          cases={conversations.map(({ id, createdAt }) => ({
            id,
            status: 'in_progress',
            createdAt,
            title: '[AI 챗봇] 학교폭력 FAQ 상담',
            to: parentChatbotPath(id),
          }))}
        />
      </PageBody>
    </>
  )
}
