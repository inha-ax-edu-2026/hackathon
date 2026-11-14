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
import { maskedStudentLabel, scheduleLabel, splitTitle } from '@/lib/counsel/teacherView.ts'
import { schoolViolenceCounselDetailPath } from '@/lib/schoolViolence/paths.ts'
import { cn } from '@/lib/utils.ts'

/**
 * 상담유형 칩 색. 종류는 개인상담·AI 챗봇 상담 두 가지뿐이다.
 * 전환 여부는 상담상태(승인대기)·읽지 않음 점·위험도가 이미 알려 주고, 전환 사유는 상세에서 본다.
 */
const CHIP_CLASS = {
  'AI 챗봇': 'bg-primary-soft text-primary',
  개인상담: 'bg-secondary text-secondary-foreground',
} as const

const COLUMNS = ['상담상태', '상담유형', '상담제목', '위험도', '상담예약일시', '상담 대상자']

/**
 * 학폭 상담 목록.
 * 행을 누르면 상세로 간다.
 */
type TeacherCaseTableProps = {
  cases: CounselCase[]
}

export function TeacherCaseTable({ cases }: TeacherCaseTableProps) {
  const navigate = useNavigate()

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="h-12 bg-card hover:bg-card">
            {COLUMNS.map((label) => (
              <TableHead
                key={label}
                className={cn(
                  'px-6 font-medium text-muted-foreground',
                  label === '위험도' && 'text-center',
                )}
              >
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((c) => {
            const { chip, text } = splitTitle(c)
            const isNew = c.handoff !== null && !c.read
            const open = () => navigate(schoolViolenceCounselDetailPath(c.id))
            return (
              <TableRow
                key={c.id}
                tabIndex={0}
                onClick={open}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') open()
                }}
                className="cursor-pointer"
              >
                <TableCell className="px-6 py-4">
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell className="px-6 py-4">
                  <Badge className={cn('rounded-md', CHIP_CLASS[chip as keyof typeof CHIP_CLASS])}>
                    {chip}
                  </Badge>
                </TableCell>
                <TableCell className="w-full px-6 py-4">
                  <span className="flex items-center gap-2">
                    <span className={cn(isNew && 'font-semibold')}>{text}</span>
                    {isNew && (
                      <span
                        role="img"
                        aria-label="읽지 않음"
                        className="size-2 rounded-full bg-primary"
                      />
                    )}
                  </span>
                </TableCell>
                <TableCell className="px-6 py-4 text-center">
                  {c.risk ? (
                    <RiskBadge risk={c.risk} />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="px-6 py-4">{scheduleLabel(c)}</TableCell>
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
