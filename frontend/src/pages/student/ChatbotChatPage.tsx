import { ChevronLeft, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useFinishCase, useHandoff, useSendMessage, useStudentCase } from '@/api/studentCounsel.ts'
import { CaseStatusBadge } from '@/components/counsel/CaseStatusBadge.tsx'
import { ChatClosedNotice } from '@/components/counsel/ChatClosedNotice.tsx'
import { ChatComposer } from '@/components/counsel/ChatComposer.tsx'
import { FinishConfirmDialog } from '@/components/counsel/FinishConfirmDialog.tsx'
import { MessageBubble, MessageList } from '@/components/counsel/MessageList.tsx'
import { TypingIndicator } from '@/components/counsel/TypingIndicator.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'
import { Button } from '@/components/ui/button.tsx'
import { ApiError } from '@/lib/api.ts'
import { TEACHER_VISIBILITY_NOTICE } from '@/lib/counsel/labels.ts'
import { cn } from '@/lib/utils.ts'

const BACK = (
  <Link to="/student/counsel" className="inline-flex items-center gap-0.5 hover:underline">
    <ChevronLeft className="size-4" /> 내 상담으로
  </Link>
)

function errorDetail(error: unknown) {
  const detail =
    error instanceof ApiError ? (error.body as { detail?: string } | null)?.detail : null
  return detail ?? '문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.'
}

/**
 * AI 챗봇 상담(`/student/counsel/chatbot/:id`).
 * 「상담중」이면 대화하고, 그 밖의 상태(전환·종료)면 같은 대화를 읽기 전용으로 보이고 아래에 안내 카드를 둔다.
 * 감지 키워드와 위험도는 학생에게 보이지 않는다.
 */
function ChatbotChatPage() {
  const { id = '' } = useParams()
  const { data, isPending, error } = useStudentCase(id)
  const sendMessage = useSendMessage(id)
  const handoff = useHandoff(id)
  const finish = useFinishCase(id)
  const [draft, setDraft] = useState('')
  const [finishOpen, setFinishOpen] = useState(false)
  // 실패한 글을 다시 보낼 때 같은 request_id를 써서 백엔드가 중복 발화로 세지 않게 한다.
  const lastRequest = useRef<{ text: string; requestId: string } | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const messageCount = data?.messages.length ?? 0
  const status = data?.case.status
  const pendingText = sendMessage.isPending ? sendMessage.variables.text : null

  // 새 말풍선·입력 중 표시·안내 카드가 나타나면 대화 맨 아래로 내린다.
  // biome-ignore lint/correctness/useExhaustiveDependencies: 값이 바뀔 때마다 실행하는 것이 목적이다.
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messageCount, pendingText, status])

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
  const open = counselCase.status === 'in_progress'
  const busy = sendMessage.isPending || handoff.isPending || finish.isPending
  const failure = [sendMessage, handoff, finish].find((m) => m.isError)?.error

  const send = (text: string) => {
    const previous = lastRequest.current
    const requestId = previous?.text === text ? previous.requestId : crypto.randomUUID()
    lastRequest.current = { text, requestId }
    setDraft('')
    sendMessage.mutate(
      { text, request_id: requestId },
      {
        onSuccess: () => {
          lastRequest.current = null
        },
        // 보내지 못한 글은 입력창에 되돌려 놓는다.
        onError: () => setDraft((current) => current || text),
      },
    )
  }

  return (
    <>
      <PageHeader
        title={counselCase.title}
        description={
          open
            ? `AI 챗봇과 이야기해요. ${TEACHER_VISIBILITY_NOTICE}.`
            : counselCase.handoff
              ? '선생님께 전달된 상담이에요. 대화는 읽기만 할 수 있어요.'
              : '끝난 상담이에요. 대화는 읽기만 할 수 있어요.'
        }
        back={BACK}
        actions={
          open ? (
            <>
              <Button size="lg" onClick={() => handoff.mutate()} disabled={busy}>
                <UserRound /> 선생님과 상담하기
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setFinishOpen(true)}
                disabled={busy}
              >
                상담 끝내기
              </Button>
            </>
          ) : (
            <CaseStatusBadge status={counselCase.status} />
          )
        }
      />
      <PageBody>
        <section className="flex flex-col gap-4 rounded-[14px] border bg-card p-6">
          <div
            ref={logRef}
            className={cn(
              'min-h-72 overflow-y-auto pr-1',
              // 끝난 화면은 입력창 대신 안내 카드가 더 커서 대화 영역을 줄인다.
              open ? 'h-[calc(100svh-330px)]' : 'h-[calc(100svh-480px)]',
            )}
          >
            <MessageList messages={messages}>
              {pendingText && (
                <MessageBubble
                  message={{ id: 'pending', role: 'student', text: pendingText, at: '' }}
                />
              )}
              {pendingText && <TypingIndicator />}
            </MessageList>
          </div>

          {failure && (
            <p role="alert" className="text-sm text-destructive">
              {errorDetail(failure)}
            </p>
          )}

          {open ? (
            <ChatComposer value={draft} onChange={setDraft} onSubmit={send} disabled={busy} />
          ) : (
            <ChatClosedNotice counselCase={counselCase} />
          )}
        </section>
      </PageBody>

      <FinishConfirmDialog
        open={finishOpen}
        onOpenChange={setFinishOpen}
        onConfirm={() => finish.mutate()}
      />
    </>
  )
}

export default ChatbotChatPage
