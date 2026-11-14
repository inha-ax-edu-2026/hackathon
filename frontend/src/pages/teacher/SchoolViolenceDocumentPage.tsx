import { ChevronLeft, Lock, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  useGenerateDocumentDraft,
  useSaveDocument,
  useSchoolViolenceCase,
  useSchoolViolenceDocument,
} from '@/api/schoolViolence.ts'
import type { DocumentField, SchoolViolenceMaterial } from '@/api/schoolViolenceTypes.ts'
import { DetailCard } from '@/components/counsel/detail/DetailCard.tsx'
import { DRAFT_MIN_MS, DraftProgress } from '@/components/schoolViolence/form/DraftProgress.tsx'
import { FieldEditor } from '@/components/schoolViolence/form/FieldEditor.tsx'
import { FieldPanel } from '@/components/schoolViolence/form/FieldPanel.tsx'
import { FormLegend } from '@/components/schoolViolence/form/FormLegend.tsx'
import { FormView } from '@/components/schoolViolence/form/FormView.tsx'
import { PrintButton, PrintMarks } from '@/components/schoolViolence/form/PrintControls.tsx'
import { MaterialDialog } from '@/components/schoolViolence/MaterialDialog.tsx'
import { PageBody, PageHeader } from '@/components/shell/PageHeader.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { ApiError } from '@/lib/api.ts'
import { apiErrorMessage } from '@/lib/schoolViolence/errors.ts'
import { collectChoices, collectSingleChoiceIds } from '@/lib/schoolViolence/forms/build.ts'
import { getFormLayout } from '@/lib/schoolViolence/forms/index.ts'
import { DOCUMENT_STATUS_LABEL, MATERIAL_KIND_LABEL } from '@/lib/schoolViolence/labels.ts'
import { schoolViolenceCasePath } from '@/lib/schoolViolence/paths.ts'

const STATUS_TONE = {
  none: 'bg-muted text-muted-foreground',
  reviewing: 'bg-warning-soft text-warning-strong',
  approved: 'bg-success-soft text-success-strong',
} as const

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 서류 화면(`/teacher/school-violence/:id/documents/:formId`): 초안 만들기 → 가이드북 표 모양 양식,
 * 범례와 근거 옆 패널. 양식은 `lib/schoolViolence/forms`의 레이아웃으로 그린다.
 */
function SchoolViolenceDocumentPage() {
  const { id = '', formId = '' } = useParams()
  const caseQuery = useSchoolViolenceCase(id)
  const documentQuery = useSchoolViolenceDocument(id, formId)
  const generate = useGenerateDocumentDraft(id, formId)
  const save = useSaveDocument(id, formId)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [source, setSource] = useState<{ material: SchoolViolenceMaterial; quote: string } | null>(
    null,
  )

  // 인쇄물에 편집기가 찍히지 않도록, 인쇄를 시작하면 칸 선택(편집 중인 칸)을 닫는다.
  useEffect(() => {
    const clearSelection = () => setSelectedId(null)
    window.addEventListener('beforeprint', clearSelection)
    return () => window.removeEventListener('beforeprint', clearSelection)
  }, [])

  const sv = caseQuery.data
  const doc = documentQuery.data
  const layout = useMemo(
    () => (sv && doc ? getFormLayout(formId)?.({ info: sv.info, fields: doc.fields }) : undefined),
    [sv, doc, formId],
  )
  const choices = useMemo(() => (layout ? collectChoices(layout) : new Map()), [layout])
  const singleChoices = useMemo(
    () => (layout ? collectSingleChoiceIds(layout) : new Set<string>()),
    [layout],
  )

  const backLink = (
    <Link
      to={{ pathname: schoolViolenceCasePath(id), search: '?tab=documents' }}
      className="inline-flex items-center gap-1"
    >
      <ChevronLeft className="size-4" />
      사안으로 돌아가기
    </Link>
  )

  if (caseQuery.isPending || documentQuery.isPending) {
    return (
      <>
        <PageHeader back={backLink} title="서류" />
        <PageBody>
          <p className="text-muted-foreground">불러오는 중이에요.</p>
        </PageBody>
      </>
    )
  }

  if (!sv || !doc) {
    const notFound = [caseQuery.error, documentQuery.error].some(
      (error) => error instanceof ApiError && error.status === 404,
    )
    return (
      <>
        <PageHeader back={backLink} title="서류" />
        <PageBody>
          <section className="rounded-xl border bg-card px-6 py-16 text-center text-muted-foreground">
            {notFound
              ? '서류를 찾을 수 없어요. 시연 초기화 뒤에는 상담 건에서 사안을 다시 접수해 주세요.'
              : '서류를 불러오지 못했어요.'}
          </section>
        </PageBody>
      </>
    )
  }

  const title = `${doc.form_id} ${doc.name}`
  const hasDraft = doc.status !== 'none'

  async function makeDraft() {
    setGenerating(true)
    setReviewError(null)
    try {
      // 요청이 빨리 끝나도 진행 표시는 끝까지 보여준다.
      await Promise.all([generate.mutateAsync({ external_consent: true }), sleep(DRAFT_MIN_MS)])
      setSelectedId(null)
    } catch {
      // 오류 문구는 generate.error로 보인다.
    } finally {
      setGenerating(false)
    }
  }

  /** 칸 값을 저장한다. 실패하면 던져서 편집기가 칸 아래에 오류를 보이게 한다. */
  async function saveValue(field: DocumentField, value: string) {
    setReviewError(null)
    await save.mutateAsync([{ id: field.id, value }])
  }

  async function toggleReview(field: DocumentField, reviewed: boolean) {
    setReviewError(null)
    try {
      await save.mutateAsync([{ id: field.id, reviewed }])
    } catch (error) {
      setReviewError(apiErrorMessage(error))
    }
  }

  const draftButton = (
    <Button onClick={() => makeDraft()} disabled={generating || doc.locked_reason !== null}>
      <Sparkles /> AI 초안 만들기
    </Button>
  )

  return (
    <>
      <PageHeader
        back={backLink}
        title={title}
        actions={
          layout && hasDraft && !generating ? (
            <PrintButton documentTitle={`${title}_사안${sv.info.case_number}호`} />
          ) : undefined
        }
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge className={STATUS_TONE[doc.status]}>{DOCUMENT_STATUS_LABEL[doc.status]}</Badge>
            <span className="text-secondary-foreground">
              학교폭력 사안 {sv.info.case_number}호 · 작성 {doc.author}
              {doc.approval && ` · ${doc.approval}`}
            </span>
          </span>
        }
      />
      <PageBody className="print:p-0">
        {layout && hasDraft && <PrintMarks approved={doc.status === 'approved'} />}

        {!layout ? (
          <section className="rounded-xl border bg-card px-6 py-16 text-center text-muted-foreground">
            이 서류 양식은 아직 열 수 없어요.
          </section>
        ) : generating ? (
          <DraftProgress formName={title} />
        ) : !hasDraft ? (
          <EmptyDraft
            materials={sv.materials}
            lockedReason={doc.locked_reason}
            error={generate.error ? apiErrorMessage(generate.error) : null}
            action={draftButton}
          />
        ) : (
          <>
            <div className="print:hidden">
              <FormLegend />
            </div>
            <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,1fr)_21rem] print:block">
              <FormView
                layout={layout}
                fields={doc.fields}
                selectedFieldId={selectedId}
                onSelectField={setSelectedId}
                renderEditor={(field) => (
                  <FieldEditor
                    field={field}
                    options={choices.get(field.id)}
                    single={singleChoices.has(field.id)}
                    onSave={saveValue}
                    onClose={() => setSelectedId(null)}
                  />
                )}
              />
              <div className="lg:sticky lg:top-4 print:hidden">
                <FieldPanel
                  field={doc.fields.find((field) => field.id === selectedId) ?? null}
                  choices={choices}
                  materials={sv.materials}
                  caseId={id}
                  onOpenSource={(material, quote) => setSource({ material, quote })}
                  onToggleReview={toggleReview}
                  reviewPending={save.isPending}
                />
                {reviewError && (
                  <p role="alert" className="mt-2 text-sm text-destructive">
                    {reviewError}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        <MaterialDialog
          material={source?.material ?? null}
          highlight={source?.quote}
          onClose={() => setSource(null)}
        />
      </PageBody>
    </>
  )
}

/** 초안을 만들기 전: AI가 읽을 사안 자료를 보여주고 「AI 초안 만들기」로 안내한다. */
function EmptyDraft({
  materials,
  lockedReason,
  error,
  action,
}: {
  materials: SchoolViolenceMaterial[]
  /** 근거 자료가 없어 초안을 만들 수 없는 이유. 있으면 버튼이 잠긴다. */
  lockedReason: string | null
  error: string | null
  action: React.ReactNode
}) {
  return (
    <DetailCard title="아직 초안이 없어요" icon={<Sparkles className="size-4 text-ai" />}>
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-secondary-foreground">
          「AI 초안 만들기」를 누르면 아래 사안 자료를 근거로 양식이 채워져요. AI가 쓴 칸은 파랑,
          교사가 판단·입력하는 칸은 주황(비어 있음)으로 보여요.
        </p>
        <p className="text-sm text-muted-foreground">
          실제 백엔드 연결에서는 선택한 가상 자료가 고성능 AI로 전송돼요. 초안은 저장한 뒤 교사가
          확인하며, 생성만으로 결재·외부 제출하지 않아요.
        </p>
        <ul className="flex flex-wrap gap-2">
          {materials.map((material) => (
            <li key={material.id}>
              <Badge variant="outline">
                {MATERIAL_KIND_LABEL[material.kind]} · {material.title}
              </Badge>
            </li>
          ))}
        </ul>
        {lockedReason && (
          <p className="flex items-center gap-1.5 text-sm text-warning-strong">
            <Lock className="size-4" /> {lockedReason}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div>{action}</div>
      </div>
    </DetailCard>
  )
}

export default SchoolViolenceDocumentPage
