import { Fragment } from 'react'
import { cn } from '@/lib/utils.ts'

type BubbleMessage = {
  id: string
  role: 'student' | 'parent' | 'bot'
  text: string
}

/** 말풍선 한 개. 질문은 오른쪽, 챗봇 답변은 왼쪽. */
export function MessageBubble({ message }: { message: BubbleMessage }) {
  const mine = message.role !== 'bot'
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <p
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap',
          mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-muted',
        )}
      >
        {message.text}
      </p>
    </div>
  )
}

type MessageListProps = {
  messages: BubbleMessage[]
  /** 목록 아래에 이어 붙일 내용(입력 중 표시, 안내 카드 등). 05번에서 쓴다. */
  children?: React.ReactNode
  /** 대화 중간에 끼워 넣을 안내(교사 알림 등)와 그 위치. messages[after] 뒤에 둔다. */
  insert?: { after: number; node: React.ReactNode }
  className?: string
}

/** 상담 대화 목록. 읽기 전용 보기와 진행 중 대화가 함께 쓴다. */
export function MessageList({ messages, children, insert, className }: MessageListProps) {
  return (
    <div role="log" aria-label="상담 대화" className={cn('flex flex-col gap-3', className)}>
      {messages.map((m, i) => (
        <Fragment key={m.id}>
          <MessageBubble message={m} />
          {insert?.after === i && insert.node}
        </Fragment>
      ))}
      {children}
    </div>
  )
}
