import { ChevronLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { useStudentCase } from '@/api/studentCounsel.ts'
import { CaseStatusBadge } from '@/components/counsel/CaseStatusBadge.tsx'
import { MessageList } from '@/components/counsel/MessageList.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'
import { ApiError } from '@/lib/api.ts'

const BACK = (
  <Link to="/student/counsel" className="inline-flex items-center gap-0.5 hover:underline">
    <ChevronLeft className="size-4" /> 내 상담으로
  </Link>
)

/**
 * AI 챗봇 상담(`/student/counsel/chatbot/:id`).
 * 지금은 상담 건을 불러와 대화를 보여 주기만 한다. 보내기·전환·끝내기는 05번 티켓에서 붙인다.
 */
function ChatbotChatPage() {
  const { id = '' } = useParams()
  const { data, isPending, error } = useStudentCase(id)

  if (isPending || error) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <>
        <PageHeader title="AI 챗봇 상담" back={BACK} />
        <PageBody>
          <p className="rounded-[14px] border bg-card px-6 py-16 text-center text-muted-foreground">
            {isPending
              ? '불러오는 중이에요.'
              : notFound
                ? '상담 건을 찾을 수 없어요.'
                : '상담을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.'}
          </p>
        </PageBody>
      </>
    )
  }

  const { case: counselCase, messages } = data
  return (
    <>
      <PageHeader
        title={counselCase.title}
        description="AI 챗봇과 이야기해요. 선생님은 요약·위험도·상담 양식을 보고, 대화 내용 전체는 보지 않아요."
        back={BACK}
        actions={<CaseStatusBadge status={counselCase.status} />}
      />
      <PageBody>
        <section className="rounded-[14px] border bg-card p-6">
          <MessageList messages={messages} />
        </section>
      </PageBody>
    </>
  )
}

export default ChatbotChatPage
