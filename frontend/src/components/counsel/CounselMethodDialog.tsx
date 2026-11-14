import { Bot, Plus, UserRound } from 'lucide-react'
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
  DialogTrigger,
} from '@/components/ui/dialog.tsx'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.tsx'
import { TEACHER_VISIBILITY_NOTICE } from '@/lib/counsel/labels.ts'
import { CHATBOT_FORM_PATH, COUNSEL_REGISTER_PATH } from '@/lib/counsel/paths.ts'
import { cn } from '@/lib/utils.ts'

type Method = 'chatbot' | 'individual'

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

/** 「상담하기」를 누르면 뜨는 상담 방식 선택 창. AI 챗봇 상담이 기본 선택이다. */
export function CounselMethodDialog() {
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<Method>('chatbot')
  const navigate = useNavigate()
  const changeOpen = (next: boolean) => {
    if (!next) setMethod('chatbot')
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus /> 상담하기
        </Button>
      </DialogTrigger>
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
          <Button variant="outline" onClick={() => changeOpen(false)}>
            취소
          </Button>
          <Button
            onClick={() => {
              changeOpen(false)
              navigate(method === 'chatbot' ? CHATBOT_FORM_PATH : COUNSEL_REGISTER_PATH)
            }}
          >
            다음
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
