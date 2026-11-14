import { useId, useRef, useState } from 'react'
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
  CURRENT_STATE,
  DETAIL_QUESTION,
  INCIDENT,
  REQUESTED_HELP,
  type Selections,
  START_TIME,
  toggleChoice,
} from '@/lib/counsel/form.ts'
import {
  chatbotPath,
  STUDENT_COUNSEL_PATH,
  STUDENT_SCHOOL_VIOLENCE_PATH,
} from '@/lib/counsel/paths.ts'
import { cn } from '@/lib/utils.ts'

const fieldClass = 'min-w-0 rounded-xl border border-border bg-muted/25 px-4 py-3'
const labelClass = 'mb-2 block text-sm font-semibold'
const STEPS = ['어떤 일이 있었나요?', '지금 나의 상태', '원하는 도움'] as const
const LAST_STEP = STEPS.length - 1

function errorMessage(error: unknown) {
  const detail =
    error instanceof ApiError ? (error.body as { detail?: string } | null)?.detail : null
  return detail ?? '상담을 시작하지 못했어요. 잠시 뒤 다시 시도해 주세요.'
}

/** AI 챗봇 상담의 상담 양식 작성(`/student/counsel/chatbot/new`). 제출하면 챗봇 화면으로 간다. */
function ChatbotFormPage({ schoolViolence = false }: { schoolViolence?: boolean }) {
  const [selections, setSelections] = useState<Selections>({})
  const [detail, setDetail] = useState('')
  const [step, setStep] = useState(0)
  const stepHeading = useRef<HTMLHeadingElement>(null)
  const id = useId()
  const navigate = useNavigate()
  const createCase = useCreateCase()
  const listPath = schoolViolence ? STUDENT_SCHOOL_VIOLENCE_PATH : STUDENT_COUNSEL_PATH
  const hasIncident = Boolean(selections[INCIDENT.question]?.length) || detail.trim() !== ''

  const goToStep = (nextStep: number) => {
    setStep(nextStep)
    requestAnimationFrame(() => {
      stepHeading.current?.focus({ preventScroll: true })
      stepHeading.current?.scrollIntoView({ block: 'nearest' })
    })
  }

  const renderChoices = (field: typeof INCIDENT, className?: string) => {
    const { question, options, hint, scaleLabels } = field
    const hintId = `${id}-${encodeURIComponent(question)}`
    return (
      <div key={question} className={cn(fieldClass, className)}>
        <fieldset className="min-w-0" aria-describedby={hint ? hintId : undefined}>
          <legend className={labelClass}>{question}</legend>
          {hint && (
            <p id={hintId} className="mb-2 text-sm text-muted-foreground">
              {hint}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {scaleLabels && <span className="text-sm text-muted-foreground">{scaleLabels[0]}</span>}
            {options.map((option) => (
              <OptionChip
                key={option}
                selected={selections[question]?.includes(option) ?? false}
                onClick={() =>
                  setSelections((current) => ({
                    ...current,
                    [question]: toggleChoice(field, current[question] ?? [], option),
                  }))
                }
              >
                {option}
              </OptionChip>
            ))}
            {scaleLabels && <span className="text-sm text-muted-foreground">{scaleLabels[1]}</span>}
          </div>
        </fieldset>
      </div>
    )
  }

  const submit = () =>
    createCase.mutate(buildCounselForm(selections, detail), {
      onSuccess: ({ case: created }) =>
        navigate(chatbotPath(created.id, listPath), { replace: true }),
    })

  return (
    <>
      <PageHeader
        title="AI 챗봇 상담 신청"
        back={<Link to={listPath}>‹ {schoolViolence ? '학폭 상담' : '내 상담'}으로 돌아가기</Link>}
      />
      <PageBody className="px-4 sm:px-8">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!hasIncident || createCase.isPending) return
            if (step === LAST_STEP) submit()
            else goToStep(step + 1)
          }}
          className="@container mx-auto w-full max-w-3xl rounded-[14px] border bg-card p-4 sm:p-6"
        >
          <header className="mb-5 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              학교폭력 상담 상황 파악 양식
            </p>
            <ol aria-label="작성 단계" className="grid grid-cols-3 gap-2">
              {STEPS.map((title, index) => (
                <li
                  key={title}
                  aria-current={index === step ? 'step' : undefined}
                  className={`border-t-2 pt-1.5 text-xs ${index === step ? 'border-primary font-semibold text-primary' : index < step ? 'border-primary/40 text-foreground' : 'border-border text-muted-foreground'}`}
                >
                  {index + 1}. {title}
                </li>
              ))}
            </ol>
          </header>

          <section aria-labelledby={`${id}-step`} className="space-y-5">
            <h2
              id={`${id}-step`}
              ref={stepHeading}
              tabIndex={-1}
              className="scroll-mt-4 text-lg font-semibold"
            >
              {STEPS[step]}
            </h2>
            {step === 0 && (
              <>
                <p className="text-sm text-muted-foreground">
                  겪은 일을 고르거나 구체적인 내용을 적어 주세요.
                </p>
                {renderChoices(INCIDENT)}
                {renderChoices(START_TIME)}
                <div className={fieldClass}>
                  <label htmlFor={`${id}-detail`} className={labelClass}>
                    {DETAIL_QUESTION}
                  </label>
                  <p id={`${id}-detail-hint`} className="mb-2 text-sm text-muted-foreground">
                    언제, 어디서, 어떤 일이 있었는지 기억나는 만큼 자유롭게 써 주세요. 상대 학생의
                    이름은 쓰지 않아도 됩니다.
                  </p>
                  <Textarea
                    id={`${id}-detail`}
                    aria-describedby={`${id}-detail-hint`}
                    rows={3}
                    maxLength={2000}
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <div className="grid gap-5 @xl:grid-cols-2">
                {CURRENT_STATE.map((field, index) =>
                  renderChoices(field, index === 0 ? '@xl:col-span-2' : undefined),
                )}
              </div>
            )}

            {step === LAST_STEP && (
              <>
                {renderChoices(REQUESTED_HELP)}
                <PrivacyNotice />
              </>
            )}
          </section>

          {createCase.isError && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {errorMessage(createCase.error)}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            {step === 0 ? (
              <Button asChild variant="outline">
                <Link to={listPath}>취소</Link>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={createCase.isPending}
                onClick={() => {
                  createCase.reset()
                  goToStep(step - 1)
                }}
              >
                이전
              </Button>
            )}
            <Button type="submit" disabled={!hasIncident || createCase.isPending}>
              {step < LAST_STEP ? '다음' : createCase.isPending ? '시작하는 중…' : '상담 시작하기'}
            </Button>
          </div>
        </form>
      </PageBody>
    </>
  )
}

export default ChatbotFormPage
