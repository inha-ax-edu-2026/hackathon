import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useCreateCase } from '@/api/studentCounsel.ts'
import { OptionChip } from '@/components/counsel/OptionChip.tsx'
import { PrivacyNotice } from '@/components/counsel/PrivacyNotice.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'
import { ApiError } from '@/lib/api.ts'
import {
  buildCounselForm,
  DURATIONS,
  EMPTY_FORM_VALUES,
  type FormValues,
  isFormComplete,
  QUESTIONS,
  TOPICS,
} from '@/lib/counsel/form.ts'
import { chatbotPath, STUDENT_COUNSEL_PATH } from '@/lib/counsel/paths.ts'

const labelClass = 'mb-2 block text-sm font-medium'

function errorMessage(error: unknown) {
  const detail =
    error instanceof ApiError ? (error.body as { detail?: string } | null)?.detail : null
  return detail ?? '상담을 시작하지 못했어요. 잠시 뒤 다시 시도해 주세요.'
}

/** AI 챗봇 상담의 상담 양식 작성(`/student/counsel/chatbot/new`). 제출하면 챗봇 화면으로 간다. */
function ChatbotFormPage() {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM_VALUES)
  const id = useId()
  const navigate = useNavigate()
  const createCase = useCreateCase()
  const patch = (change: Partial<FormValues>) => setValues((v) => ({ ...v, ...change }))
  const canSubmit = isFormComplete(values) && !createCase.isPending

  const submit = () =>
    createCase.mutate(buildCounselForm(values), {
      onSuccess: ({ case: created }) => navigate(chatbotPath(created.id), { replace: true }),
    })

  return (
    <>
      <PageHeader
        title="AI 챗봇 상담 신청"
        description="상담 전에 상담 양식을 작성하면 바로 AI 챗봇과 이야기할 수 있어요."
        back={<Link to={STUDENT_COUNSEL_PATH}>‹ 내 상담으로 돌아가기</Link>}
      />
      <PageBody>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (canSubmit) submit()
          }}
          className="max-w-3xl space-y-6 rounded-[14px] border bg-card p-6"
        >
          <fieldset>
            <legend className={labelClass}>
              상담 주제 <span className="text-primary">*</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((t) => (
                <OptionChip
                  key={t}
                  selected={values.topic === t}
                  onClick={() => patch({ topic: t })}
                >
                  {t}
                </OptionChip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={labelClass}>{QUESTIONS.mood}</legend>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <OptionChip
                  key={n}
                  selected={values.mood === n}
                  onClick={() => patch({ mood: values.mood === n ? null : n })}
                >
                  {n}
                </OptionChip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={labelClass}>{QUESTIONS.duration}</legend>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <OptionChip
                  key={d}
                  selected={values.duration === d}
                  onClick={() => patch({ duration: values.duration === d ? null : d })}
                >
                  {d}
                </OptionChip>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor={`${id}-concern`} className={labelClass}>
              {QUESTIONS.concern} <span className="text-primary">*</span>
            </label>
            <Textarea
              id={`${id}-concern`}
              rows={4}
              placeholder="편하게 적어 주세요."
              value={values.concern}
              onChange={(e) => patch({ concern: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor={`${id}-wish`} className={labelClass}>
              {QUESTIONS.wish} (선택)
            </label>
            <Textarea
              id={`${id}-wish`}
              rows={3}
              value={values.wish}
              onChange={(e) => patch({ wish: e.target.value })}
            />
          </div>

          <PrivacyNotice />

          {createCase.isError && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(createCase.error)}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button asChild variant="outline" size="lg">
              <Link to={STUDENT_COUNSEL_PATH}>취소</Link>
            </Button>
            <Button type="submit" size="lg" disabled={!canSubmit}>
              {createCase.isPending ? '시작하는 중…' : '상담 시작하기'}
            </Button>
          </div>
        </form>
      </PageBody>
    </>
  )
}

export default ChatbotFormPage
