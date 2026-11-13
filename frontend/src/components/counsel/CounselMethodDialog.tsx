import { Bot, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.tsx'
import { TEACHER_VISIBILITY_NOTICE } from '@/lib/counsel/labels.ts'
import { cn } from '@/lib/utils.ts'

type Method = 'chatbot' | 'individual'

const NEXT_PATH: Record<Method, string> = {
  chatbot: '/student/counsel/chatbot/new',
  individual: '/student/counsel/register',
}

const OPTIONS: { value: Method; title: string; description: string; icon: typeof Bot }[] = [
  {
    value: 'chatbot',
    title: 'AI 챗봇 상담',
    description: '예약 없이 지금 바로. 필요하면 선생님 상담으로 넘길 수 있어요.',
    icon: Bot,
  },
  {
    value: 'individual',
    title: '개인상담 (대면 · 화상 · 전화)',
    description: '날짜를 정해 선생님과 직접 상담해요. 선생님 승인 후 진행돼요.',
    icon: UserRound,
  },
]

type CounselMethodDialogProps = { open: boolean; onOpenChange: (open: boolean) => void }

/** 「+ 상담 신청하기」를 누르면 뜨는 상담 방식 선택 창. AI 챗봇 상담이 기본 선택이다. */
export function CounselMethodDialog({ open, onOpenChange }: CounselMethodDialogProps) {
  const [method, setMethod] = useState<Method>('chatbot')
  const navigate = useNavigate()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setMethod('chatbot')
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>상담 방식 선택</DialogTitle>
          <DialogDescription>어떤 방식으로 상담할지 골라 주세요.</DialogDescription>
        </DialogHeader>

        <RadioGroup value={method} onValueChange={(v) => setMethod(v as Method)}>
          {OPTIONS.map(({ value, title, description, icon: Icon }) => (
            <label
              key={value}
              htmlFor={`method-${value}`}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition',
                method === value ? 'border-primary bg-primary/5' : 'hover:bg-accent',
              )}
            >
              <RadioGroupItem id={`method-${value}`} value={value} className="mt-0.5" />
              <Icon className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
              <span className="space-y-1">
                <span className="block font-medium">{title}</span>
                <span className="block text-sm text-muted-foreground">{description}</span>
              </span>
            </label>
          ))}
        </RadioGroup>

        {method === 'chatbot' && (
          <p className="rounded-lg bg-muted px-4 py-3 text-sm text-secondary-foreground">
            {TEACHER_VISIBILITY_NOTICE}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={() => navigate(NEXT_PATH[method])}>다음</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
