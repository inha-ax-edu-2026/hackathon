import { useTeacherCases } from '@/api/teacherCounsel.ts'
import { SCHOOL_VIOLENCE_TOPIC } from '@/lib/counsel/form.ts'
import { splitTitle } from '@/lib/counsel/teacherView.ts'
import { schoolViolenceCounselDetailPath } from '@/lib/schoolViolence/paths.ts'
import { TeacherCaseTable } from './TeacherCaseTable.tsx'

// 상담 목록에는 주제 필드가 없어 제목과 서버가 감지한 키워드로 관련 상담을 찾는다.
const SCHOOL_VIOLENCE_CUES = /학교폭력|폭행|맞았|따돌|왕따|괴롭|폭력·위협/

export function TeacherCounselList({ schoolViolence = false }: { schoolViolence?: boolean }) {
  const { data, isPending, isError } = useTeacherCases()

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

  const cases = schoolViolence
    ? data.filter(
        (c) =>
          splitTitle(c).text === `${SCHOOL_VIOLENCE_TOPIC} 상담` ||
          c.detected_keywords.some((keyword) => SCHOOL_VIOLENCE_CUES.test(keyword)),
      )
    : data

  if (cases.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">상담 내역이 없어요.</p>
  }

  return (
    <TeacherCaseTable
      cases={cases}
      detailPath={schoolViolence ? schoolViolenceCounselDetailPath : undefined}
    />
  )
}
