import { HeartHandshake, UserRound } from 'lucide-react'
import type { CounselCase, Message } from '@/api/counselTypes.ts'
import { CrisisContacts } from '@/components/counsel/ChatClosedNotice.tsx'
import { Button } from '@/components/ui/button.tsx'

/**
 * 키워드 감지로 선생님께 알림이 간 자리에 끼워 넣을 메시지 위치.
 * 알림을 일으킨 학생 발화(handoff.at 이전 마지막 메시지) 뒤, 바로 이어진 챗봇 답까지 지나서 둔다.
 * 키워드 전환이 아니면 -1. 반환값 i는 「messages[i] 뒤에 둔다」는 뜻이다.
 */
export function handoffNoticeIndex(counselCase: CounselCase, messages: Message[]) {
  const handoff = counselCase.handoff
  if (handoff?.reason !== 'keyword') return -1
  const at = Date.parse(handoff.at)
  let index = -1
  messages.forEach((m, i) => {
    if (Date.parse(m.at) <= at) index = i
  })
  if (index < 0) return -1
  if (messages[index].role === 'student' && messages[index + 1]?.role === 'bot') index += 1
  return index
}

type HandoffNoticeProps = {
  counselCase: CounselCase
  /** 대화가 열려 있을 때만 받는다. 「지금 선생님과 상담하기」 버튼을 보인다. */
  onTalkToTeacher?: () => void
  disabled?: boolean
}

/**
 * 대화 중 키워드 감지로 선생님께 알림이 갔음을 학생에게 알리는 안내 블록.
 * 경고처럼 보이지 않게 말풍선 사이 가운데에 부드러운 카드로 둔다. 감지 키워드·위험도는 보이지 않는다.
 * 위험도가 높을 때만 위기 연락처를 덧붙인다.
 */
export function HandoffNotice({ counselCase, onTalkToTeacher, disabled }: HandoffNoticeProps) {
  return (
    <div className="flex justify-center py-1">
      <section
        role="status"
        aria-label="선생님께 알림"
        className="w-full max-w-md space-y-3 rounded-xl border border-info/40 bg-info-soft px-5 py-4 text-sm"
      >
        <div className="flex gap-3">
          <HeartHandshake className="mt-0.5 size-5 shrink-0 text-info-strong" />
          <div className="space-y-1">
            <p className="font-medium">
              이야기해 줘서 고마워요. 걱정돼서 선생님께도 알려 드렸어요.
            </p>
            <p className="text-secondary-foreground">
              선생님이 곧 연락하실 거예요. 그동안 여기서 계속 이야기해도 괜찮아요.
            </p>
          </div>
        </div>
        {counselCase.risk === 'high' && <CrisisContacts />}
        {onTalkToTeacher && (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={onTalkToTeacher} disabled={disabled}>
              <UserRound /> 지금 선생님과 상담하기
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
