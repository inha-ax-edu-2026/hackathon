import { useStudentCases } from '@/api/studentCounsel.ts'
import { CounselHistory } from '@/components/counsel/CounselHistory.tsx'
import { CounselMethodDialog } from '@/components/counsel/CounselMethodDialog.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'
import { SCHOOL_VIOLENCE_TOPIC } from '@/lib/counsel/form.ts'
import { DEMO_TEACHER_NAME } from '@/lib/counsel/identity.ts'
import { chatbotPath } from '@/lib/counsel/paths.ts'

/** 학생 「학폭 상담」 목록. */
function StudentCounselPage() {
  const { data, isPending, isError } = useStudentCases()
  // 목록에는 주제 필드가 없고 API가 챗봇 제목을 상담 양식의 주제로 만든다.
  const cases = (data?.cases ?? []).filter(
    (c) => c.kind === 'chatbot' && c.title === `[AI 챗봇] ${SCHOOL_VIOLENCE_TOPIC} 상담`,
  )

  return (
    <>
      <PageHeader
        title="학폭 상담"
        description="학교폭력 상담 내역을 확인해요."
        actions={<CounselMethodDialog />}
      />
      <PageBody>
        <CounselHistory
          cases={cases.map((c) => ({
            id: c.id,
            // 키워드 알림 이후에도 대화가 열려 있으면 상담중으로 표시한다.
            status: c.chat_open ? 'in_progress' : c.status,
            createdAt: c.created_at,
            title: c.title,
            to: chatbotPath(c.id),
            teacher: `${DEMO_TEACHER_NAME} 선생님`,
          }))}
          isPending={isPending}
          isError={isError}
        />
      </PageBody>
    </>
  )
}

export default StudentCounselPage
