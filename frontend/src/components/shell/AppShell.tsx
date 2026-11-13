import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { Lnb, type LnbMenuItem } from './Lnb.tsx'
import { ShellContext } from './shellContext.ts'

type AppShellProps = {
  homeTo: string
  name: string
  identity: string
  menu: LnbMenuItem[]
  bell: ReactNode
}

/**
 * 슈퍼스쿨식 셸: 접힌 왼쪽 LNB + 오른쪽 페이지 영역(#F9FAFB).
 * 페이지는 <PageHeader>와 <PageBody>로 흰 헤더와 본문을 그린다.
 */
export function AppShell({ homeTo, name, identity, menu, bell }: AppShellProps) {
  return (
    <ShellContext.Provider value={{ identity }}>
      <div className="flex min-h-svh bg-canvas text-foreground">
        <Lnb homeTo={homeTo} name={name} menu={menu} bell={bell} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </ShellContext.Provider>
  )
}
