import { ChevronRight } from 'lucide-react'
import type { CounselCase } from '@/api/counselTypes.ts'
import { RiskBadge } from '@/components/counsel/CaseBadges.tsx'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet.tsx'
import { HANDOFF_REASON_LABEL } from '@/lib/counsel/labels.ts'
import { maskedStudentLabel, splitTitle, timeAgo } from '@/lib/counsel/teacherView.ts'

type NotificationSheetProps = {
  parentCount?: number
  urgentParentCount?: number
  onSelectParent?: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 안 읽은 전환 건(알림). 최신순. */
  notifications: CounselCase[]
  onSelect: (counselCase: CounselCase) => void
}

/** 종을 누르면 오른쪽에서 열리는 알림 시트. 항목을 누르면 상담 상세로 간다. */
export function NotificationSheet({
  open,
  onOpenChange,
  notifications,
  onSelect,
  parentCount = 0,
  urgentParentCount = 0,
  onSelectParent,
}: NotificationSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="text-lg">알림</SheetTitle>
          <SheetDescription>학생 상담 전환과 학부모 문의를 확인해 주세요.</SheetDescription>
        </SheetHeader>
        {parentCount > 0 && (
          <button
            type="button"
            className="border-b bg-primary/5 p-5 text-left"
            onClick={onSelectParent}
          >
            <span className="font-semibold text-primary">학부모 문의 {parentCount}건</span>
            {urgentParentCount > 0 && (
              <span className="ml-2 text-sm font-bold text-destructive">
                긴급 {urgentParentCount}건
              </span>
            )}
            <p className="mt-1 text-sm text-muted-foreground">학부모 문의함에서 확인·답변하기 →</p>
          </button>
        )}
        {notifications.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
            <p className="font-medium">새 학생 상담 알림이 없습니다</p>
            <p className="text-sm text-muted-foreground">
              새로운 알림이 도착하면 여기에 표시됩니다
            </p>
          </div>
        ) : (
          <ul className="flex-1 divide-y overflow-y-auto">
            {notifications.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c)}
                  className="flex w-full items-center gap-3 px-6 py-4 text-left transition-colors hover:bg-accent"
                >
                  <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex items-center gap-2">
                      <span className="font-medium">
                        {maskedStudentLabel(c.student)} 학생이 개인상담으로 전환됐어요
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                      {c.risk && <RiskBadge risk={c.risk} />}
                      {c.handoff && <span>{HANDOFF_REASON_LABEL[c.handoff.reason]}</span>}
                      <span>{splitTitle(c).text}</span>
                      {c.handoff && <span>· {timeAgo(c.handoff.at)}</span>}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  )
}
