import { useNavigate } from 'react-router'
import type { SchoolViolenceCaseListItem } from '@/api/schoolViolenceTypes.ts'
import { StageBadge } from '@/components/schoolViolence/StageBadge.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx'
import { formatDateTime } from '@/lib/counsel/format.ts'
import { ROLE_LABEL } from '@/lib/schoolViolence/labels.ts'
import { schoolViolenceCasePath } from '@/lib/schoolViolence/paths.ts'
import { cn } from '@/lib/utils.ts'

const COLUMNS = ['사안번호', '관련 학생', '현재 단계', '서류 진행률', '접수 일시']

/** 「학교폭력 사안」 표. 행을 누르면 사안 페이지로 간다. */
export function SchoolViolenceCaseTable({ cases }: { cases: SchoolViolenceCaseListItem[] }) {
  const navigate = useNavigate()

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="h-12 bg-card hover:bg-card">
            {COLUMNS.map((label) => (
              <TableHead key={label} className="px-6 font-medium text-muted-foreground">
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((c) => {
            const open = () => navigate(schoolViolenceCasePath(c.id))
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
                <TableCell className="px-6 py-4 font-medium tabular-nums">
                  {c.case_number}호
                </TableCell>
                <TableCell className="w-full px-6 py-4">
                  <span className="flex flex-wrap gap-x-3 gap-y-1">
                    {c.students.map((s) => (
                      <span key={s.name} className="whitespace-nowrap">
                        {s.name}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {ROLE_LABEL[s.role]}
                        </span>
                      </span>
                    ))}
                  </span>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <StageBadge stage={c.stage} />
                </TableCell>
                <TableCell className="px-6 py-4">
                  <Progress approved={c.progress.approved} total={c.progress.total} />
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  {formatDateTime(c.received_at)}
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

/** 작업 가능한 서류 중 승인한 수. 칸 하나가 서류 하나다. */
function Progress({ approved, total }: { approved: number; total: number }) {
  return (
    <span
      role="img"
      aria-label={`서류 ${total}종 중 ${approved}종 승인`}
      className="inline-flex items-center gap-2"
    >
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: 순서가 곧 정체성인 고정 칸
            key={i}
            className={cn('h-2 w-6 rounded-full', i < approved ? 'bg-primary' : 'bg-muted')}
          />
        ))}
      </span>
      <span className="text-sm tabular-nums text-secondary-foreground">
        {approved}/{total} 승인
      </span>
    </span>
  )
}
