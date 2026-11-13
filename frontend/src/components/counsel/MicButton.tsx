import { Mic, Square } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { cn } from '@/lib/utils.ts'

type MicButtonProps = {
  listening: boolean
  onStart: () => void
  onStop: () => void
  disabled?: boolean
}

/** 말하기 버튼. 누르면 듣기 시작하고, 듣는 중에 다시 누르면 멈춘다. */
export function MicButton({ listening, onStart, onStop, disabled }: MicButtonProps) {
  return (
    <Button
      type="button"
      size="lg"
      variant={listening ? 'destructive' : 'outline'}
      aria-pressed={listening}
      disabled={disabled}
      onClick={listening ? onStop : onStart}
      className={cn(listening && 'animate-pulse')}
    >
      {listening ? <Square /> : <Mic />}
      {listening ? '멈추기' : '말하기'}
    </Button>
  )
}
