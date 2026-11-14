import { ChevronLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'
import { PARENT_SCHOOL_VIOLENCE_PATH } from '@/lib/counsel/paths.ts'
import ParentGuidancePage from '@/pages/ParentGuidancePage.tsx'

export default function ParentChatbotPage() {
  const { id } = useParams()
  const actorId = id === 'guardian_offender' ? 'guardian_offender' : 'guardian_victim'
  return (
    <>
      <PageHeader
        title="학교폭력 안내 상담"
        description="학교 절차와 자녀의 진행 단계를 확인하고, 필요한 도움을 담당 교사에게 요청해요."
        back={
          <Link
            to={PARENT_SCHOOL_VIOLENCE_PATH}
            className="inline-flex items-center hover:underline"
          >
            <ChevronLeft className="size-4" /> 목록으로 돌아가기
          </Link>
        }
      />
      <PageBody>
        <ParentGuidancePage key={actorId} actorId={actorId} embedded />
      </PageBody>
    </>
  )
}
