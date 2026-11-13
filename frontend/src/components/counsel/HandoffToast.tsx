type HandoffToastProps = {
  message: string
  onOpen: () => void
}

/** 교사 전환 알림 토스트. 토스트 어디를 눌러도 그 상담 건 상세로 간다. */
export function HandoffToast({ message, onOpen }: HandoffToastProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-[var(--width)] cursor-pointer items-center gap-3 rounded-[var(--radius)] border bg-popover p-4 text-left text-sm text-popover-foreground shadow-lg transition-colors hover:bg-muted"
    >
      <span className="flex-1 font-medium">{message}</span>
      <span className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
        상세 보기
      </span>
    </button>
  )
}
