import { CalendarDays, Info, UserRound } from 'lucide-react'
import type { CounselCase, CounselForm } from '@/api/counselTypes.ts'
import { formatDateTime } from '@/lib/counsel/format.ts'
import { DEMO_TEACHER_NAME } from '@/lib/counsel/identity.ts'
import { CASE_STATUS_LABEL } from '@/lib/counsel/labels.ts'
import { DetailCard, InfoRows } from './DetailCard.tsx'

const PILL = 'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium'

/** 슈퍼스쿨 「상담 일정 및 방법」의 예약일시 칸. 전환 건은 「일정 미정」, 종료 건·그 밖은 「-」. */
function scheduleText(c: CounselCase) {
  if (c.schedule.at) return formatDateTime(c.schedule.at)
  return c.status === 'awaiting_approval' || c.status === 'awaiting_counsel' ? '일정 미정' : '-'
}

/** ⑤ 기존 슈퍼스쿨 카드: 상담 대상, 일정 및 방법, 메타. */
export function SuperschoolCards({
  counsel,
  form,
}: {
  counsel: CounselCase
  form: CounselForm | null
}) {
  const { student } = counsel
  return (
    <>
      <DetailCard title="상담 대상" icon={<UserRound className="size-4 text-muted-foreground" />}>
        <InfoRows
          rows={[
            {
              label: '상담대상 유형',
              value: <span className={`${PILL} bg-info-soft text-info-strong`}>학생</span>,
            },
            {
              label: '상담 대상자 1',
              value: (
                <div className="rounded-lg bg-muted px-4 py-3">
                  <p className="font-semibold">{student.name}</p>
                  <p className="text-muted-foreground">
                    {student.grade}학년 {student.class}반 {student.number}번 · 학생
                  </p>
                </div>
              ),
            },
          ]}
        />
      </DetailCard>

      <DetailCard
        title="상담 일정 및 방법"
        icon={<CalendarDays className="size-4 text-muted-foreground" />}
      >
        <InfoRows
          rows={[
            { label: '상담 예약일시', value: scheduleText(counsel) },
            { label: '상담 방법', value: counsel.schedule.method ?? '-' },
            { label: '상담 주제', value: form?.topic ?? '-' },
            { label: '상담 장소', value: '장소 미정' },
          ]}
        />
      </DetailCard>

      <DetailCard title="상담 정보" icon={<Info className="size-4 text-muted-foreground" />}>
        <InfoRows
          rows={[
            { label: '진행 상태', value: CASE_STATUS_LABEL[counsel.status] },
            { label: '상담 교사', value: `${DEMO_TEACHER_NAME} 선생님` },
            { label: '등록자', value: student.name },
            { label: '등록일시', value: formatDateTime(counsel.created_at) },
            { label: '학년도', value: '2026학년도' },
          ]}
        />
      </DetailCard>
    </>
  )
}
