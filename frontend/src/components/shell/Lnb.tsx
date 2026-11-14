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
  /** 프로필에 표시할 이름 */
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
      className="sticky top-0 flex h-svh w-22 shrink-0 flex-col items-center gap-3 border-r bg-secondary py-4"
    >
      <Link
        to={homeTo}
        aria-label="홈"
        className="mt-4 flex h-8 w-12 shrink-0 items-center justify-center rounded-md text-primary"
      >
        <svg viewBox="18 17 129 167" className="h-7 w-auto" fill="currentColor" aria-hidden="true">
          <path d="M82.8339 17L32.2102 68.4259L47.3085 83.7634L82.8339 47.6751L117.471 82.8612L132.569 67.5237L82.8339 17Z" />
          <path d="M18 118.047V98.1987H73.0644V158.647H51.7491V118.047H18Z" />
          <path d="M146.78 118.047V98.1987H91.7153V183.909H113.031V118.047H146.78Z" />
        </svg>
      </Link>
      <span
        role="img"
        aria-label={name}
        title={name}
        className="relative mt-0.5 size-12 shrink-0 rounded-[14px] bg-linear-to-tr from-[#a5b6c0] to-[#c5cfd6]"
      >
        <span className="absolute top-[10px] left-[17px] size-[15px] rounded-full bg-linear-to-tr from-[#d4dfe6] to-[#f9fbfc] shadow-[-3px_2px_5px_#8299a899]" />
        <span className="absolute top-[24px] left-[14px] h-[13px] w-[21px] rounded-t-[12px] rounded-b-xs bg-linear-to-tr from-[#d6e1e7] to-[#fbfcfd] shadow-[0_3px_5px_#8299a8]" />
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
