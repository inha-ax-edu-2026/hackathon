import { ShieldAlert } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import type { SchoolViolenceRecommendation } from '@/api/counselTypes.ts'
import { useIntakeSchoolViolenceCase } from '@/api/schoolViolence.ts'
import { DetailCard } from '@/components/counsel/detail/DetailCard.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { apiErrorMessage } from '@/lib/schoolViolence/errors.ts'
import { schoolViolenceCasePath } from '@/lib/schoolViolence/paths.ts'

type IntakeCardProps = {
  counselCaseId: string
  /** 이 상담 건에서 이미 접수한 사안 ID. 접수 전에는 null. */
  schoolViolenceCaseId: string | null
  /** 감지 키워드에 따른 학폭 권고. 참고용이며 사안을 만들지 않는다. */
  recommendation: SchoolViolenceRecommendation
}

/**
 * 상담 상세 「사후 서류」 탭의 학교폭력 사안 카드. 접수 전에는 「학폭 사안으로 접수」,
 * 접수 뒤에는 「사안 열기」. 사안은 교사가 접수해야만 생긴다(키워드·AI가 만들지 않는다).
 */
export function IntakeCard({
  counselCaseId,
  schoolViolenceCaseId,
  recommendation,
}: IntakeCardProps) {
  const navigate = useNavigate()
  const intake = useIntakeSchoolViolenceCase()
  // 이미 접수한 건에는 권고 대신 「사안 열기」만 보인다.
  const showRecommendation = recommendation.recommended && !schoolViolenceCaseId

  return (
    <DetailCard title="학교폭력 사안" icon={<ShieldAlert className="size-4 text-primary" />}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-secondary-foreground">
          {schoolViolenceCaseId
            ? '이 상담 건은 학교폭력 사안으로 접수했어요. 사안 페이지에서 서류를 이어서 처리해요.'
            : '학교폭력 정황이 있으면 이 상담 건을 사안으로 접수해 서류 처리를 시작해요. 접수는 학교장 보고로 이어지는 절차라 선생님이 직접 눌러야 해요.'}
        </p>
        {schoolViolenceCaseId ? (
          <Button asChild>
            <Link to={schoolViolenceCasePath(schoolViolenceCaseId)}>사안 열기</Link>
          </Button>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-3">
            {showRecommendation && (
              <Badge className="bg-warning-soft text-warning-strong">학폭 사안일 수 있음</Badge>
            )}
            <Button
              disabled={intake.isPending}
              onClick={() =>
                intake.mutate(counselCaseId, {
                  onSuccess: ({ case: created }) => navigate(schoolViolenceCasePath(created.id)),
                })
              }
            >
              학폭 사안으로 접수
            </Button>
          </div>
        )}
      </div>
      {showRecommendation && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
          <span className="text-muted-foreground">근거 키워드</span>
          {recommendation.keywords.map((keyword) => (
            <Badge key={keyword} className="bg-primary-soft text-foreground">
              {keyword}
            </Badge>
          ))}
          <span className="text-muted-foreground">
            키워드로 짐작한 참고 의견이에요. 사안 접수 여부는 선생님이 정해요.
          </span>
        </div>
      )}
      {intake.isError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {apiErrorMessage(intake.error)}
        </p>
      )}
    </DetailCard>
  )
}
