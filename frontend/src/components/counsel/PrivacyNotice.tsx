import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils.ts'

type PrivacyNoticeProps = {
  className?: string
}

/**
 * 비밀보장의 한계를 상담 시작 전에 알리는 안내 카드.
 * 키워드 감지로 선생님께 알림이 간 뒤에야 처음 알게 되지 않도록, 양식 화면과 대화 맨 위에 둔다.
 * 대화 중 알림 안내 카드(HandoffNotice)와 같은 톤으로 맞춘다.
 */
export function PrivacyNotice({ className }: PrivacyNoticeProps) {
  return (
    <aside
      aria-label="비밀보장 안내"
      className={cn(
        'flex gap-3 rounded-xl border border-info/40 bg-info-soft px-5 py-4 text-sm',
        className,
      )}
    >
      <ShieldCheck className="mt-0.5 size-5 shrink-0 text-info-strong" />
      <div className="space-y-1">
        <p className="font-medium">챗봇과 나눈 이야기는 비밀로 지켜져요.</p>
        <p className="text-secondary-foreground">
          다만 안전이 걱정되는 이야기가 나오면, 도움을 받을 수 있도록 담임 선생님께 알려 드려요.
        </p>
      </div>
    </aside>
  )
}
