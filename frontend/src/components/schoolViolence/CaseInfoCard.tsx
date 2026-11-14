import { ClipboardList, Pencil } from 'lucide-react'
import { useSearchParams } from 'react-router'
import type { SchoolViolenceInfo } from '@/api/schoolViolenceTypes.ts'
import { DetailCard, InfoRows } from '@/components/counsel/detail/DetailCard.tsx'
import { CaseInfoEditSheet } from '@/components/schoolViolence/CaseInfoEditSheet.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx'
import { formatDateTime } from '@/lib/counsel/format.ts'
import { SEPARATION_EXCEPTIONS } from '@/lib/schoolViolence/forms/options.ts'
import { GENDER_LABEL, guardianNoticeLabel, ROLE_LABEL } from '@/lib/schoolViolence/labels.ts'
import { INFO_EDIT_PARAM, INFO_EDIT_VALUE } from '@/lib/schoolViolence/paths.ts'
import { cn } from '@/lib/utils.ts'

const ROLE_TONE = {
  victim: 'bg-info-soft text-info-strong',
  offender: 'bg-destructive-soft text-destructive-strong',
  witness: 'bg-muted text-muted-foreground',
} as const

/**
 * 사안 정보: 학교·사안번호·접수 일시·책임교사와 관련 학생 표. 서류들이 이 값을 가져다 쓰므로
 * 여기서 고친다(「고치기」). 서류의 사안 정보 칸을 눌러 오면 `?edit=info`로 편집 패널이 열린 채 도착한다.
 */
export function CaseInfoCard({ caseId, info }: { caseId: string; info: SchoolViolenceInfo }) {
  const [params, setParams] = useSearchParams()
  const editing = params.get(INFO_EDIT_PARAM) === INFO_EDIT_VALUE
  const setEditing = (open: boolean) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (open) next.set(INFO_EDIT_PARAM, INFO_EDIT_VALUE)
        else next.delete(INFO_EDIT_PARAM)
        return next
      },
      { replace: true },
    )

  return (
    <DetailCard
      title="사안 정보"
      icon={<ClipboardList className="size-4 text-muted-foreground" />}
      aside={
        <span className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">서류 칸이 이 값을 가져다 써요</span>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil /> 고치기
          </Button>
        </span>
      }
    >
      <CaseInfoEditSheet caseId={caseId} info={info} open={editing} onOpenChange={setEditing} />
      <InfoRows
        rows={[
          { label: '학교명', value: info.school_name },
          {
            label: '사안번호',
            value: (
              <span className="inline-flex items-center gap-2">
                {info.school_name.replace(/학교$/, '')}학교 {info.case_number}호
                <Badge variant="outline" className="text-muted-foreground">
                  자동 부여
                </Badge>
              </span>
            ),
          },
          { label: '접수 일시', value: formatDateTime(info.received_at) },
          { label: '책임교사', value: info.teacher_name },
          { label: '교감', value: info.vice_principal },
        ]}
      />

      <h3 className="mt-5 mb-2 text-sm font-semibold text-secondary-foreground">
        관련 학생 {info.students.length}명
      </h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>학년/반/번호</TableHead>
            <TableHead>성별</TableHead>
            <TableHead>구분</TableHead>
            <TableHead>보호자 통보</TableHead>
            <TableHead>비고</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {info.students.map((student) => (
            <TableRow key={student.name}>
              <TableCell className="font-medium">
                {student.name}
                {student.found_during_investigation && (
                  <Badge variant="outline" className="ml-2 text-muted-foreground">
                    조사 중 확인
                  </Badge>
                )}
              </TableCell>
              <TableCell className="tabular-nums">
                {student.grade} / {student.class} / {student.number}
              </TableCell>
              <TableCell>{GENDER_LABEL[student.gender]}</TableCell>
              <TableCell>
                <Badge className={cn(ROLE_TONE[student.role])}>{ROLE_LABEL[student.role]}</Badge>
              </TableCell>
              <TableCell>{guardianNoticeLabel(student.guardian_notice)}</TableCell>
              <TableCell className="text-muted-foreground">{student.note ?? '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="mt-4 text-sm text-muted-foreground">
        분리 시행 :{' '}
        {info.separation.enforced === null
          ? '아직 정하지 않았어요.'
          : info.separation.enforced
            ? `시행${info.separation.period ? ` (${info.separation.period})` : ''}`
            : `미시행${exceptionText(info)}`}
      </p>
    </DetailCard>
  )
}

/** 분리를 하지 않을 때 고른 예외 사유. 없으면 빈 글. */
function exceptionText(info: SchoolViolenceInfo) {
  const labels = info.separation.exception_reasons.map(
    (id) => SEPARATION_EXCEPTIONS.find((option) => option.id === id)?.label ?? id,
  )
  return labels.length > 0 ? ` (예외 사유: ${labels.join(', ')})` : ''
}
