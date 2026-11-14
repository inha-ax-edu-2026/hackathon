import { useTeacherCases } from '@/api/teacherCounsel.ts'
import { TeacherCaseTable } from './TeacherCaseTable.tsx'

export function TeacherCounselList() {
  const { data: cases, isPending, isError } = useTeacherCases()

  if (isPending) {
    return <p className="py-12 text-center text-muted-foreground">불러오는 중이에요…</p>
  }
  if (isError) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        상담 목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.
      </p>
    )
  }

  if (cases.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">상담 내역이 없어요.</p>
  }

  return <TeacherCaseTable cases={cases} />
}
