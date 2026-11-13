import { MessageSquareQuote } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'

type ExampleSentenceProps = {
  text: string
  onPick: (text: string) => void
  disabled?: boolean
}

/** 음성이 안 될 때 눌러 입력창에 채우는 예시 문장. 보내기는 따로 눌러야 한다. */
export function ExampleSentence({ text, onPick, disabled }: ExampleSentenceProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="shrink-0 text-muted-foreground">예시 문장</span>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled}
        onClick={() => onPick(text)}
        title={text}
        className="min-w-0 justify-start"
      >
        <MessageSquareQuote />
        <span className="truncate">{text}</span>
      </Button>
    </div>
  )
}
