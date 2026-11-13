import { useNavigate } from 'react-router'
import type { CounselCase } from '@/api/counselTypes.ts'
import { RiskBadge, StatusBadge } from '@/components/counsel/CaseBadges.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx'
import { counselDetailPath } from '@/hooks/useHandoffToasts.tsx'
import { maskedStudentLabel, scheduleLabel, splitTitle } from '@/lib/counsel/teacherView.ts'
import { cn } from '@/lib/utils.ts'

const CHIP_CLASS = {
  'AI 챗봇': 'bg-primary-soft text-primary',
  개인상담: 'bg-secondary text-secondary-foreground',
} as const

/** 「개인상담 관리」 표. 기존 4열(상담상태·상담예약일시·상담제목·상담 대상자) 그대로, 행을 누르면 상세로 간다. */
export function TeacherCaseTable({ cases }: { cases: CounselCase[] }) {
  const navigate = useNavigate()

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="h-12 bg-card hover:bg-card">
            {['상담상태', '상담예약일시', '상담제목', '상담 대상자'].map((label) => (
              <TableHead key={label} className="px-6 font-medium text-muted-foreground">
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((c) => {
            const { chip, text } = splitTitle(c)
            const isNew = c.handoff !== null && !c.read
            return (
              <TableRow
                key={c.id}
                tabIndex={0}
                onClick={() => navigate(counselDetailPath(c.id))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(counselDetailPath(c.id))
                }}
                className="cursor-pointer"
              >
                <TableCell className="px-6 py-4">
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell className="px-6 py-4">{scheduleLabel(c)}</TableCell>
                <TableCell className="px-6 py-4">
                  <span className="flex items-center gap-2">
                    <Badge
                      className={cn('rounded-md', CHIP_CLASS[chip as keyof typeof CHIP_CLASS])}
                    >
                      {chip}
                    </Badge>
                    <span className={cn(isNew && 'font-semibold')}>{text}</span>
                    {c.risk && <RiskBadge risk={c.risk} />}
                    {isNew && (
                      <span
                        role="img"
                        aria-label="읽지 않음"
                        className="size-2 rounded-full bg-primary"
                      />
                    )}
                  </span>
                </TableCell>
                <TableCell className="px-6 py-4 underline underline-offset-2">
                  {maskedStudentLabel(c.student)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <div className="border-t px-6 py-3 text-sm text-muted-foreground">총 {cases.length}건</div>
    </div>
  )
}
