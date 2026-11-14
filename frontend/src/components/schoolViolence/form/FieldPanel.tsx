import { Link2, MousePointerClick, PenLine, Quote, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import type { DocumentField, SchoolViolenceMaterial } from '@/api/schoolViolenceTypes.ts'
import { DetailCard } from '@/components/counsel/detail/DetailCard.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Checkbox } from '@/components/ui/checkbox.tsx'
import { isAiField } from '@/lib/schoolViolence/aiField.ts'
import { type ChoiceOption, parseChoice } from '@/lib/schoolViolence/forms/options.ts'
import { MATERIAL_KIND_LABEL } from '@/lib/schoolViolence/labels.ts'
import { schoolViolenceInfoEditPath } from '@/lib/schoolViolence/paths.ts'

type FieldPanelProps = {
  /** 눌러서 고른 칸. 없으면 안내만 보인다. */
  field: DocumentField | null
  /** 체크 칸의 선택지(칸 id별). 칸 값을 글자로 바꿀 때 쓴다. */
  choices: Map<string, ChoiceOption[]>
  materials: SchoolViolenceMaterial[]
  caseId: string
  /** 인용문의 출처 원문을 연다. */
  onOpenSource: (material: SchoolViolenceMaterial, quote: string) => void
  /** AI 칸의 검토 표시를 바꾼다. 없으면 검토 체크를 보이지 않는다. */
  onToggleReview?: (field: DocumentField, reviewed: boolean) => void
  /** 검토 표시를 저장하는 중 */
  reviewPending?: boolean
}

/** 체크 칸은 고른 선택지 이름으로, 나머지는 값 그대로. */
function displayValue(field: DocumentField, choices: Map<string, ChoiceOption[]>) {
  const options = choices.get(field.id)
  if (!options) return field.value
  return parseChoice(field.value)
    .map((id) => options.find((option) => option.id === id)?.label ?? id)
    .join(', ')
}

/**
 * 옆 패널. 눌러서 고른 칸이 AI 칸이면 근거 인용과 출처 사안 자료를, 사안 정보 칸이면 어디서 고치는지를,
 * 판단 칸이면 사람이 채우는 칸이라는 설명을 보인다. 인쇄할 때는 숨긴다.
 */
export function FieldPanel({
  field,
  choices,
  materials,
  caseId,
  onOpenSource,
  onToggleReview,
  reviewPending,
}: FieldPanelProps) {
  return (
    <aside aria-label="칸 설명" className="print:hidden">
      <DetailCard
        title="칸 설명"
        icon={<MousePointerClick className="size-4 text-muted-foreground" />}
      >
        {field ? (
          <Body
            field={field}
            choices={choices}
            materials={materials}
            caseId={caseId}
            onOpenSource={onOpenSource}
            onToggleReview={onToggleReview}
            reviewPending={reviewPending}
          />
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            양식의 칸을 누르면 여기에 설명이 나와요. AI가 쓴 칸(파랑)은 근거가 된 원문 인용과 출처
            자료를 볼 수 있어요.
          </p>
        )}
      </DetailCard>
    </aside>
  )
}

function Body({
  field,
  choices,
  materials,
  caseId,
  onOpenSource,
  onToggleReview,
  reviewPending,
}: FieldPanelProps & { field: DocumentField }) {
  const value = displayValue(field, choices)
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <KindBadge kind={field.kind} />
        <h3 className="font-semibold">{field.label}</h3>
      </div>

      {value !== '' && (
        <p className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed whitespace-pre-line">
          {value}
        </p>
      )}

      {isAiField(field) && onToggleReview && (
        <section className="space-y-2 rounded-lg border border-ai/40 bg-ai-soft/40 p-3">
          <label htmlFor="field-review" className="flex items-center gap-2 text-sm font-semibold">
            <Checkbox
              id="field-review"
              checked={field.reviewed}
              disabled={reviewPending}
              onCheckedChange={(checked) => onToggleReview(field, checked === true)}
            />
            이 칸을 검토했어요
          </label>
          <p className="text-xs leading-relaxed text-muted-foreground">
            인용된 원문과 맞는지 확인한 뒤 체크해요. 칸을 고치면 검토 표시가 풀려서 다시 확인해야
            해요.
          </p>
        </section>
      )}

      {field.kind === 'narrative' && field.edited && (
        <p className="rounded-lg bg-judge-soft p-3 text-xs leading-relaxed text-judge">
          교사가 고친 칸이에요. 아래 인용은 AI가 처음 쓴 내용의 근거라서, 고친 내용 전부를
          입증하지는 않아요.
        </p>
      )}

      {field.kind === 'narrative' && (
        <section className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-secondary-foreground">
            <Quote className="size-3.5" /> 근거 인용 {field.evidence.length}건
          </h4>
          {field.evidence.length === 0 ? (
            <p className="text-sm text-muted-foreground">이 칸에는 근거 인용이 없어요.</p>
          ) : (
            <ul className="space-y-2">
              {field.evidence.map((item) => {
                const material = materials.find((m) => m.id === item.source_id)
                return (
                  <li key={`${item.source_id}:${item.quote}`} className="rounded-lg border p-3">
                    <blockquote className="border-l-2 border-ai pl-2 text-sm leading-relaxed">
                      {item.quote}
                    </blockquote>
                    {material ? (
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <Badge variant="outline">{MATERIAL_KIND_LABEL[material.kind]}</Badge>
                          <span className="truncate">{material.title}</span>
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenSource(material, item.quote)}
                        >
                          원문에서 보기
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        출처 자료를 찾을 수 없어요.
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            AI가 쓴 초안이에요. 인용된 원문과 맞는지 확인하고, 시각·금액처럼 진술이 엇갈리는 내용은
            원문을 대조해 주세요.
          </p>
        </section>
      )}

      {field.kind === 'admin' && (
        <section className="space-y-2 text-sm leading-relaxed">
          <p className="text-muted-foreground">
            사안 정보에서 가져온 값이에요. 서류에서는 고치지 않고, 사안 정보를 고치면 서류에도 바로
            반영돼요.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to={schoolViolenceInfoEditPath(caseId)}>사안 정보 고치기</Link>
          </Button>
        </section>
      )}

      {(field.kind === 'manual' || field.kind === 'sensitive') && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          교사가 직접 판단하거나 입력하는 칸이에요. AI는 이 칸을 채우지 않아요.
          {field.kind === 'sensitive' && ' 장애 여부 같은 민감한 정보라 추정하지 않아요.'}
        </p>
      )}
    </div>
  )
}

function KindBadge({ kind }: { kind: DocumentField['kind'] }) {
  if (kind === 'narrative') {
    return (
      <Badge className="bg-ai-soft text-ai">
        <Sparkles /> AI 작성
      </Badge>
    )
  }
  if (kind === 'admin') {
    return (
      <Badge variant="outline">
        <Link2 /> 사안 정보에서 가져옴
      </Badge>
    )
  }
  return (
    <Badge className="bg-judge-soft text-judge">
      <PenLine /> 교사 판단·입력
    </Badge>
  )
}
