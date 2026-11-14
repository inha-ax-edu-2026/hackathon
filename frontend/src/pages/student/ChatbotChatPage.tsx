import { ChevronLeft, HeartHandshake, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useFinishCase, useHandoff, useSendMessage, useStudentCase } from '@/api/studentCounsel.ts'
import { StatusBadge } from '@/components/counsel/CaseBadges.tsx'
import { ChatClosedNotice } from '@/components/counsel/ChatClosedNotice.tsx'
import { ChatComposer } from '@/components/counsel/ChatComposer.tsx'
import {
  type CloseChatAction,
  CloseChatConfirmDialog,
} from '@/components/counsel/CloseChatConfirmDialog.tsx'
import { ExampleSentence } from '@/components/counsel/ExampleSentence.tsx'
import { HandoffNotice, handoffNoticeIndex } from '@/components/counsel/HandoffNotice.tsx'
import { MessageBubble, MessageList } from '@/components/counsel/MessageList.tsx'
import { MicButton } from '@/components/counsel/MicButton.tsx'
import { PrivacyNotice } from '@/components/counsel/PrivacyNotice.tsx'
import { TypingIndicator } from '@/components/counsel/TypingIndicator.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'
import { Button } from '@/components/ui/button.tsx'
import { useVoiceInput } from '@/hooks/useVoiceInput.ts'
import { ApiError } from '@/lib/api.ts'
import { DEMO_LINES } from '@/lib/counsel/demoLines.ts'
import { STUDENT_SCHOOL_VIOLENCE_PATH } from '@/lib/counsel/paths.ts'
import { VOICE_ERROR_MESSAGES } from '@/lib/counsel/voice.ts'
import { cn } from '@/lib/utils.ts'

function errorDetail(error: unknown) {
  const detail =
    error instanceof ApiError ? (error.body as { detail?: string } | null)?.detail : null
  return detail ?? '문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.'
}

/**
 * 학교폭력 AI 챗봇 상담.
 * 대화가 열려 있으면(chat_open) 대화하고, 학생이 버튼으로 닫았으면 읽기 전용으로 보이고 아래에 안내 카드를 둔다.
 * 키워드 감지로 교사에게 알림이 가도 대화는 이어진다. 알림이 간 자리에 안내 블록을 끼우고 머리말 설명을 바꿔 학생도 알게 한다.
 * 감지 키워드·위험도는 학생에게 보이지 않는다(위험도 높음일 때 위기 연락처만 덧붙는다).
 */
function ChatbotChatPage() {
  const { id = '' } = useParams()
  const { data, isPending, error } = useStudentCase(id)
  const sendMessage = useSendMessage(id)
  const handoff = useHandoff(id)
  const finish = useFinishCase(id)
  const [draft, setDraft] = useState('')
  // 「선생님과 상담하기」·「상담 끝내기」 모두 확인 창을 거친다. 종류는 닫는 동안 문구가 바뀌지 않게 따로 둔다.
  const [confirmAction, setConfirmAction] = useState<CloseChatAction>('finish')
  const [confirmOpen, setConfirmOpen] = useState(false)
  // 음성은 입력창만 채운다. 학생이 확인·수정한 뒤 직접 보낸다.
  const voice = useVoiceInput({ onText: setDraft })
  // 실패한 글을 다시 보낼 때 같은 request_id를 써서 백엔드가 중복 발화로 세지 않게 한다.
  const lastRequest = useRef<{ text: string; requestId: string } | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const messageCount = data?.messages.length ?? 0
  const status = data?.case.status
  const pendingText = sendMessage.isPending ? sendMessage.variables.text : null
  const backLink = (
    <Link
      to={STUDENT_SCHOOL_VIOLENCE_PATH}
      className="inline-flex items-center gap-0.5 hover:underline"
    >
      <ChevronLeft className="size-4" /> 학폭 상담으로
    </Link>
  )

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
        <PageHeader title="AI 챗봇 상담" back={backLink} />
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
  const open = counselCase.chat_open
  // 예시 문장은 순서대로 보내야 세 번째에서 선생님께 전달되므로, 지금까지 보낸 학생 말 수로 다음 문장을 고른다.
  const studentTurns = messages.filter((m) => m.role === 'student').length
  const busy = sendMessage.isPending || handoff.isPending || finish.isPending
  const failure = [sendMessage, handoff, finish].find((m) => m.isError)?.error
  // 키워드 감지로 선생님께 알림이 갔으면 그 자리에 안내 블록을 끼워 학생도 알게 한다.
  const noticeAfter = handoffNoticeIndex(counselCase, messages)
  const notified = open && counselCase.handoff !== null

  const askToClose = (action: CloseChatAction) => {
    setConfirmAction(action)
    setConfirmOpen(true)
  }

  const send = (text: string) => {
    if (busy) return
    const previous = lastRequest.current
    const requestId = previous?.text === text ? previous.requestId : crypto.randomUUID()
    lastRequest.current = { text, requestId }
    voice.cancel()
    voice.dismissError()
    setDraft((current) => (current.trim() === text ? '' : current))
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
          notified ? (
            <span className="inline-flex items-center gap-1.5">
              <HeartHandshake className="size-4 text-info-strong" />
              선생님께도 전달됐어요. 여기서 계속 이야기할 수 있어요.
            </span>
          ) : open ? (
            'AI 챗봇과 이야기해요.'
          ) : counselCase.handoff ? (
            '선생님께 전달된 상담이에요. 대화는 읽기만 할 수 있어요.'
          ) : (
            '끝난 상담이에요. 대화는 읽기만 할 수 있어요.'
          )
        }
        back={backLink}
        actions={
          open ? (
            <>
              <Button size="lg" onClick={() => askToClose('handoff')} disabled={busy}>
                <UserRound /> 선생님과 상담하기
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => askToClose('finish')}
                disabled={busy}
              >
                상담 끝내기
              </Button>
            </>
          ) : (
            <StatusBadge status={counselCase.status} />
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
            {/* 대화에 들어오자마자 보이도록 맨 위에 둔다. 알림 안내 카드처럼 가운데 카드로. */}
            <div className="flex justify-center pb-4">
              <PrivacyNotice className="w-full max-w-md" />
            </div>
            <MessageList
              messages={messages}
              insert={
                noticeAfter >= 0
                  ? {
                      after: noticeAfter,
                      node: (
                        <HandoffNotice
                          counselCase={counselCase}
                          onTalkToTeacher={open ? () => askToClose('handoff') : undefined}
                          disabled={busy}
                        />
                      ),
                    }
                  : undefined
              }
            >
              {pendingText && (
                <MessageBubble message={{ id: 'pending', role: 'student', text: pendingText }} />
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
            <>
              {voice.error && (
                <p role="status" className="text-sm text-destructive">
                  {VOICE_ERROR_MESSAGES[voice.error]}
                </p>
              )}
              <ChatComposer
                value={draft}
                // 듣는 중에 직접 고치면 인식을 끊어, 뒤늦게 온 결과가 고친 글을 덮지 않게 한다.
                onChange={(value) => {
                  voice.cancel()
                  setDraft(value)
                }}
                onSubmit={send}
                // 응답을 기다리는 동안에도 입력과 말하기는 가능하고, 전송만 막는다.
                sending={busy}
                suggestions={
                  <ExampleSentence
                    text={DEMO_LINES[studentTurns % DEMO_LINES.length]}
                    onPick={send}
                    disabled={busy}
                  />
                }
                actions={
                  <MicButton
                    listening={voice.listening}
                    onStart={() => voice.start(draft)}
                    onStop={voice.stop}
                  />
                }
              />
            </>
          ) : (
            <ChatClosedNotice counselCase={counselCase} />
          )}
        </section>
      </PageBody>

      <CloseChatConfirmDialog
        action={confirmAction}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => (confirmAction === 'handoff' ? handoff : finish).mutate()}
      />
    </>
  )
}

export default ChatbotChatPage
