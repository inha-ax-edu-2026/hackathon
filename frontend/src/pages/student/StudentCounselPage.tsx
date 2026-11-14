import { Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useStudentCases } from '@/api/studentCounsel.ts'
import { StatusBadge } from '@/components/counsel/CaseBadges.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'
import { Button } from '@/components/ui/button.tsx'
import { SCHOOL_VIOLENCE_TOPIC } from '@/lib/counsel/form.ts'
import { formatDateTime } from '@/lib/counsel/format.ts'
import { DEMO_TEACHER_NAME } from '@/lib/counsel/identity.ts'
import { CHATBOT_FORM_PATH, chatbotPath } from '@/lib/counsel/paths.ts'

const COLUMNS = ['상담상태', '상담방식', '상담일시', '상담제목', '상담 교사']

/** 학생 「학폭 상담」 목록. */
function StudentCounselPage() {
  const navigate = useNavigate()
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
        actions={
          <Button asChild size="lg">
            <Link to={CHATBOT_FORM_PATH}>
              <Plus /> 상담하기
            </Link>
          </Button>
        }
      />
      <PageBody>
        <section className="overflow-hidden rounded-[14px] border bg-card">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="h-12 border-b text-muted-foreground">
                {COLUMNS.map((name) => (
                  <th key={name} className="px-6 font-medium">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const open = () => navigate(chatbotPath(c.id))
                return (
                  <tr
                    key={c.id}
                    onClick={open}
                    className="cursor-pointer border-b hover:bg-accent/60"
                  >
                    <td className="px-6 py-4">
                      {/* 키워드 알림으로 승인대기가 돼도 학생이 대화 중이면 「상담중」으로 보인다. */}
                      <StatusBadge status={c.chat_open ? 'in_progress' : c.status} />
                    </td>
                    <td className="px-6 py-4">AI 챗봇</td>
                    <td className="px-6 py-4">{formatDateTime(c.created_at)}</td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          open()
                        }}
                        className="text-left font-medium hover:underline"
                      >
                        {c.title}
                      </button>
                    </td>
                    <td className="px-6 py-4">{DEMO_TEACHER_NAME} 선생님</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {(isPending || isError || cases.length === 0) && (
            <p className="px-6 py-16 text-center text-muted-foreground">
              {isPending
                ? '불러오는 중이에요.'
                : isError
                  ? '상담 목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.'
                  : '아직 학폭 상담이 없어요. 「상담하기」로 시작해 보세요.'}
            </p>
          )}
          {!isPending && (
            <p className="border-t px-6 py-3 text-sm text-muted-foreground">총 {cases.length}건</p>
          )}
        </section>
      </PageBody>
    </>
  )
}

export default StudentCounselPage
