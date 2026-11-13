import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type OptionChipProps = { selected: boolean; onClick: () => void; children: ReactNode }

/** 선택지 하나를 알약 모양 버튼으로 보여준다. */
export function OptionChip({ selected, onClick, children }: OptionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'rounded-full border px-3 py-1 text-sm transition',
        selected ? 'border-sky-600 bg-sky-600 text-white' : 'bg-background hover:bg-accent',
      )}
    >
      {children}
    </button>
  )
}
