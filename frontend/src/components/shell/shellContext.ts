import { createContext, useContext } from 'react'

export type ShellInfo = {
  /** 페이지 헤더 오른쪽에 보이는 고정 신원. 예: 「2학년 3반 12번 김하늘」 */
  identity: string
}

export const ShellContext = createContext<ShellInfo | null>(null)

/** 셸 안의 페이지가 셸 정보를 읽는다. 셸 밖에서 부르면 null. */
export function useShell() {
  return useContext(ShellContext)
}
