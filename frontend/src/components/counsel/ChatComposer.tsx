import { Loader2, SendHorizontal } from 'lucide-react'
import { type ReactNode, useRef } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'

type ChatComposerProps = {
  /** 입력 중인 글. 음성 인식 결과나 예시 문장도 이 값으로 채워 넣는다. */
  value: string
  onChange: (value: string) => void
  /** 비어 있지 않은 글을 보낼 때 부른다. 비우는 일은 부르는 쪽이 한다. */
  onSubmit: (text: string) => void
  /**
   * 보내는 중(응답 대기). 입력창은 그대로 두어 포커스와 다음 글 쓰기를 이어 가고,
   * 보내기 버튼만 막고 로딩 표시를 한다.
   */
  sending?: boolean
  /** 입력창 위 자리. 예시 문장 칩(06번). */
  suggestions?: ReactNode
  /** 보내기 버튼 왼쪽 자리. 마이크 버튼(06번). */
  actions?: ReactNode
}

/**
 * 채팅 입력창. Enter로 보내고 Shift+Enter로 줄을 바꾼다.
 * 마이크 버튼과 예시 문장 칩은 `actions`·`suggestions` 자리로 붙인다.
 */
export function ChatComposer({
  value,
  onChange,
  onSubmit,
  sending,
  suggestions,
  actions,
}: ChatComposerProps) {
  const text = value.trim()
  const canSend = !sending && text.length > 0
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const send = () => {
    if (!canSend) return
    onSubmit(text)
    // 버튼을 눌러 보낸 경우에도 입력창으로 포커스를 돌려 바로 이어 쓸 수 있게 한다.
    inputRef.current?.focus()
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
      className="space-y-3"
    >
      {suggestions}
      <div className="flex items-end gap-2">
        <Textarea
          ref={inputRef}
          aria-label="챗봇에게 보낼 말"
          rows={1}
          placeholder="하고 싶은 이야기를 적어 보세요."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // 한글 조합 중 Enter는 글자 확정이므로 보내지 않는다.
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send()
            }
          }}
          // 한 줄일 때 옆 버튼(size="lg", h-10)과 높이를 맞추고, 글이 길어지면 아래로 늘어난다.
          className="max-h-40 min-h-10 resize-none"
        />
        {actions}
        <Button type="submit" size="lg" disabled={!canSend} aria-busy={sending}>
          {sending ? <Loader2 className="animate-spin" /> : <SendHorizontal />} 보내기
        </Button>
      </div>
    </form>
  )
}
