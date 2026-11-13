import { Bell } from 'lucide-react'
import type { ComponentProps } from 'react'

type BellButtonProps = ComponentProps<'button'> & {
  /** 안 읽은 알림 수. 0이면 배지를 숨긴다. */
  count?: number
}

/** LNB의 알림 종. 안 읽은 수가 있으면 마젠타 원형 배지를 붙인다. */
export function BellButton({ count = 0, ...props }: BellButtonProps) {
  return (
    <button
      type="button"
      aria-label={count > 0 ? `알림 ${count}건` : '알림'}
      className="relative flex size-10 items-center justify-center rounded-lg text-secondary-foreground hover:bg-accent"
      {...props}
    >
      <Bell className="size-5" />
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4.5 font-semibold text-primary-foreground">
          {count}
        </span>
      )}
    </button>
  )
}
