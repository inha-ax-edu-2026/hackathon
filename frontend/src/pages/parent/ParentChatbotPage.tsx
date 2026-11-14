import { ChevronLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ChatComposer } from '@/components/counsel/ChatComposer.tsx'
import { MessageList } from '@/components/counsel/MessageList.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'
import { Button } from '@/components/ui/button.tsx'
import { sendParentQuestion, useParentConversations } from '@/lib/counsel/parentConversations.ts'
import { PARENT_FAQ } from '@/lib/counsel/parentFaq.ts'
import { PARENT_SCHOOL_VIOLENCE_PATH, parentChatbotPath } from '@/lib/counsel/paths.ts'

export default function ParentChatbotPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const conversations = useParentConversations()
  const conversation = conversations.find((item) => item.id === id)
  const log = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (conversation && log.current) log.current.scrollTop = log.current.scrollHeight
  }, [conversation])

  function send(question: string) {
    try {
      const nextId = sendParentQuestion(id, question)
      if (!nextId) return
      setDraft('')
      setError(false)
      if (!id) navigate(parentChatbotPath(nextId), { replace: true })
    } catch {
      setError(true)
    }
  }

  return (
    <>
      <PageHeader
        title="학교폭력 FAQ 상담"
        description="학교에 알리는 방법과 상담 준비, 이후 절차를 안내해요."
        showConnection={false}
        back={
          <Link
            to={PARENT_SCHOOL_VIOLENCE_PATH}
            className="inline-flex items-center hover:underline"
          >
            <ChevronLeft className="size-4" /> 목록으로 돌아가기
          </Link>
        }
      />
      <PageBody>
        {id && !conversation ? (
          <p role="status" className="rounded-[14px] border bg-card p-6 text-muted-foreground">
            저장된 대화가 없어요. 목록에서 새 상담을 시작할 수 있어요.
          </p>
        ) : (
          <section className="flex flex-col gap-4 rounded-[14px] border bg-card p-6">
            <div ref={log} className="h-[calc(100svh-360px)] min-h-56 overflow-y-auto pr-1">
              <MessageList
                messages={[
                  {
                    id: 'greeting',
                    role: 'bot',
                    text: '안녕하세요. 학교폭력 관련해서 궁금한 점을 골라 누르거나 직접 적어 주세요.',
                  },
                  ...(conversation?.messages ?? []),
                ]}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                대화를 저장하지 못했어요. 브라우저 저장 공간을 확인한 뒤 다시 보내 주세요.
              </p>
            )}
            <ChatComposer
              value={draft}
              onChange={setDraft}
              onSubmit={send}
              suggestions={
                <div className="flex flex-wrap gap-2">
                  {PARENT_FAQ.map(({ question }) => (
                    <Button
                      key={question}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => send(question)}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              }
            />
          </section>
        )}
      </PageBody>
    </>
  )
}
