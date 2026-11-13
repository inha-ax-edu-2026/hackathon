import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router'
import { ComingSoon } from '@/components/shell/ComingSoon.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'

/** 상담 건 상세(`/teacher/manage-apply/counsel/:id`). 08번 티켓에서 채운다. */
function CounselDetailPage() {
  return (
    <>
      <PageHeader
        back={
          <Link to="/teacher/manage-apply/counsel" className="inline-flex items-center gap-1">
            <ChevronLeft className="size-4" />
            목록으로 돌아가기
          </Link>
        }
        title="상담 상세"
        description="상담 정보를 조회하고 수정합니다."
      />
      <PageBody>
        <ComingSoon />
      </PageBody>
    </>
  )
}

export default CounselDetailPage
