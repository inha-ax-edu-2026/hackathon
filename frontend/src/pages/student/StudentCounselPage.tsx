import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { CounselCase } from '@/api/counselTypes.ts'
import { useStudentCases } from '@/api/studentCounsel.ts'
import { StatusBadge } from '@/components/counsel/CaseBadges.tsx'
import { CounselMethodDialog } from '@/components/counsel/CounselMethodDialog.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'
import { Button } from '@/components/ui/button.tsx'
import { formatDateTime } from '@/lib/counsel/format.ts'
import { DEMO_TEACHER_NAME } from '@/lib/counsel/identity.ts'
import { chatbotPath } from '@/lib/counsel/paths.ts'

const COLUMNS = ['상담상태', '상담방식', '상담일시', '상담제목', '상담 교사']

const methodLabel = (c: CounselCase) =>
  c.kind === 'chatbot' ? 'AI 챗봇' : c.schedule.method ? `${c.schedule.method}상담` : '개인상담'

/** AI 챗봇 상담은 예약이 없으므로 상담을 시작한 시각을 보인다. */
const dateLabel = (c: CounselCase) => {
  const at = c.kind === 'chatbot' ? c.created_at : c.schedule.at
  return at ? formatDateTime(at) : '-'
}

/** 학생 「내 상담」 목록 + 상담 방식 선택 창. */
function StudentCounselPage() {
  const [pickerOpen, setPickerOpen] = useState(false)
  const navigate = useNavigate()
  const { data, isPending, isError } = useStudentCases()
  const cases = data?.cases ?? []

  return (
    <>
      <PageHeader
        title="내 상담"
        description="선생님과 나눈 상담과 신청한 상담을 확인해요."
        actions={
          <Button size="lg" onClick={() => setPickerOpen(true)}>
            <Plus /> 상담 신청하기
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
                // 개인상담 건은 상세 화면이 아직 없어 열리지 않는다.
                const openable = c.kind === 'chatbot'
                const open = () => navigate(chatbotPath(c.id))
                return (
                  <tr
                    key={c.id}
                    onClick={openable ? open : undefined}
                    className={openable ? 'cursor-pointer border-b hover:bg-accent/60' : 'border-b'}
                  >
                    <td className="px-6 py-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-6 py-4">{methodLabel(c)}</td>
                    <td className="px-6 py-4">{dateLabel(c)}</td>
                    <td className="px-6 py-4">
                      {openable ? (
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
                      ) : (
                        c.title
                      )}
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
                  : '아직 상담이 없어요. 「상담 신청하기」로 시작해 보세요.'}
            </p>
          )}
          {!isPending && (
            <p className="border-t px-6 py-3 text-sm text-muted-foreground">총 {cases.length}건</p>
          )}
        </section>
      </PageBody>
      <CounselMethodDialog open={pickerOpen} onOpenChange={setPickerOpen} />
    </>
  )
}

export default StudentCounselPage
