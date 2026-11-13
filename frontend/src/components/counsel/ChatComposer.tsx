import { SendHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'

type ChatComposerProps = {
  /** 입력 중인 글. 음성 인식 결과나 예시 문장도 이 값으로 채워 넣는다. */
  value: string
  onChange: (value: string) => void
  /** 비어 있지 않은 글을 보낼 때 부른다. 비우는 일은 부르는 쪽이 한다. */
  onSubmit: (text: string) => void
  /** 보내는 중이거나 상담이 끝난 뒤. 입력과 보내기를 막는다. */
  disabled?: boolean
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
  disabled,
  suggestions,
  actions,
}: ChatComposerProps) {
  const text = value.trim()
  const canSend = !disabled && text.length > 0
  const send = () => {
    if (canSend) onSubmit(text)
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
          aria-label="챗봇에게 보낼 말"
          rows={2}
          placeholder="하고 싶은 이야기를 적어 보세요."
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // 한글 조합 중 Enter는 글자 확정이므로 보내지 않는다.
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send()
            }
          }}
          className="min-h-[52px] resize-none"
        />
        {actions}
        <Button type="submit" size="lg" disabled={!canSend}>
          <SendHorizontal /> 보내기
        </Button>
      </div>
    </form>
  )
}
