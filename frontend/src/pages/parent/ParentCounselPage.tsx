import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useParentWorkspace } from '@/api/parentGuidance.ts'
import { CounselHistory } from '@/components/counsel/CounselHistory.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'
import { Button } from '@/components/ui/button.tsx'
import { PARENT_CHATBOT_NEW_PATH, parentChatbotPath } from '@/lib/counsel/paths.ts'

export default function ParentCounselPage() {
  const [actor, setActor] = useState('guardian_victim')
  const workspace = useParentWorkspace(actor)
  const data = workspace.data
  const first = data?.turns[0]
  const createdAt = first?.at ?? data?.inquiries.at(-1)?.at
  return (
    <>
      <PageHeader
        title="학폭 상담"
        description="학교폭력 안내 상담과 교사 문의 내역을 확인해요."
        actions={
          <Button size="lg" asChild>
            <Link
              to={actor === 'guardian_victim' ? PARENT_CHATBOT_NEW_PATH : parentChatbotPath(actor)}
            >
              <Plus /> 상담하기
            </Link>
          </Button>
        }
      />
      <PageBody>
        <div className="mb-5 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={actor === 'guardian_victim' ? 'default' : 'outline'}
            onClick={() => setActor('guardian_victim')}
          >
            피해 관련 보호자 체험
          </Button>
          <Button
            size="sm"
            variant={actor === 'guardian_offender' ? 'default' : 'outline'}
            onClick={() => setActor('guardian_offender')}
          >
            가해 관련 보호자 체험
          </Button>
          <span className="self-center text-xs text-muted-foreground">가상 보호자 시연</span>
        </div>
        <CounselHistory
          isPending={workspace.isPending}
          isError={workspace.isError}
          cases={
            data && createdAt
              ? [
                  {
                    id: actor,
                    status: 'in_progress',
                    createdAt,
                    title: '[안내 챗봇] 학교폭력 절차 · 교사 문의',
                    to: parentChatbotPath(actor),
                    teacher: data.profile.teacher,
                  },
                ]
              : []
          }
        />
        {workspace.error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {workspace.error.message}
          </p>
        )}
      </PageBody>
    </>
  )
}
