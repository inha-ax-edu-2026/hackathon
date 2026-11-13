import type { Msg } from '@/lib/consult/model'
import { cn } from '@/lib/utils'

type ChatBubbleProps = { message: Msg }

/** 학생·AI·시스템 메시지 한 줄. 학생은 오른쪽, AI는 왼쪽, 시스템 안내는 가운데. */
export function ChatBubble({ message }: ChatBubbleProps) {
  if (message.role === 'system') {
    return (
      <p className="mx-auto max-w-[90%] rounded-md bg-amber-100 px-3 py-1.5 text-center text-xs text-amber-900">
        {message.text}
      </p>
    )
  }
  const mine = message.role === 'student'
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <p
        className={cn(
          'max-w-[82%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap',
          mine ? 'rounded-br-sm bg-sky-600 text-white' : 'rounded-bl-sm bg-muted',
        )}
      >
        {message.text}
      </p>
    </div>
  )
}

export function TypingBubble() {
  return (
    <div className="flex">
      <span className="rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2 text-sm text-muted-foreground">
        입력 중…
      </span>
    </div>
  )
}
