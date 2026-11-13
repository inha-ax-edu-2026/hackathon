import { LayoutGrid, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { cn } from '@/lib/utils.ts'

export type LnbMenuItem = {
  /** 두 글자 라벨. 예: 「상담」 */
  label: string
  icon: LucideIcon
  /** 경로가 없으면 시연 범위 밖 메뉴로, 눌러도 아무 일도 하지 않는다. */
  to?: string
}

type LnbProps = {
  homeTo: string
  /** 프로필 아바타에 보일 이름 */
  name: string
  menu: LnbMenuItem[]
  /** 알림 종 자리. 교사 셸만 동작하는 종을 넣는다. */
  bell: ReactNode
}

const itemClass =
  'flex size-13 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium text-secondary-foreground transition-colors'

/** 슈퍼스쿨식 접힌 왼쪽 메뉴(LNB): 로고 · 프로필 · 알림 종 · 전체 메뉴 · 퀵메뉴. */
export function Lnb({ homeTo, name, menu, bell }: LnbProps) {
  return (
    <nav
      aria-label="주 메뉴"
      className="sticky top-0 flex h-svh w-20 shrink-0 flex-col items-center gap-3 border-r bg-sidebar py-4"
    >
      <Link
        to={homeTo}
        aria-label="홈"
        className="flex size-10 items-center justify-center rounded-xl bg-brand text-base font-bold text-brand-foreground"
      >
        S
      </Link>
      <span
        title={name}
        className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
      >
        {name.slice(0, 1)}
      </span>
      {bell}
      <button
        type="button"
        aria-label="전체 메뉴 살펴보기"
        className="flex size-10 items-center justify-center rounded-lg text-secondary-foreground hover:bg-accent"
      >
        <LayoutGrid className="size-5" />
      </button>
      <hr className="w-10" />
      <ul className="flex flex-col gap-2">
        {menu.map(({ label, icon: Icon, to }) => (
          <li key={label}>
            {to ? (
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    itemClass,
                    isActive ? 'bg-primary-soft text-primary' : 'border bg-card hover:bg-accent',
                  )
                }
              >
                <Icon className="size-5" />
                {label}
              </NavLink>
            ) : (
              <button
                type="button"
                title="시연에서는 열리지 않는 메뉴예요"
                className={cn(itemClass, 'border bg-card hover:bg-accent')}
              >
                <Icon className="size-5" />
                {label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
