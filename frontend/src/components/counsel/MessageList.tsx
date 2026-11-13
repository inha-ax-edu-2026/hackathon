import type { Message } from '@/api/counselTypes.ts'
import { cn } from '@/lib/utils.ts'

/** 말풍선 한 개. 학생은 오른쪽, 챗봇은 왼쪽. */
export function MessageBubble({ message }: { message: Message }) {
  const mine = message.role === 'student'
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <p
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
          mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-muted',
        )}
      >
        {message.text}
      </p>
    </div>
  )
}

type MessageListProps = {
  messages: Message[]
  /** 목록 아래에 이어 붙일 내용(입력 중 표시, 안내 카드 등). 05번에서 쓴다. */
  children?: React.ReactNode
  className?: string
}

/** 상담 대화 목록. 읽기 전용 보기와 진행 중 대화가 함께 쓴다. */
export function MessageList({ messages, children, className }: MessageListProps) {
  return (
    <div role="log" aria-label="상담 대화" className={cn('flex flex-col gap-3', className)}>
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      {children}
    </div>
  )
}
