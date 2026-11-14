import { useState } from 'react'
import type { DocumentField } from '@/api/schoolViolenceTypes.ts'
import { Button } from '@/components/ui/button.tsx'
import { Checkbox } from '@/components/ui/checkbox.tsx'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'
import { apiErrorMessage } from '@/lib/schoolViolence/errors.ts'
import { type ChoiceOption, joinChoice, parseChoice } from '@/lib/schoolViolence/forms/options.ts'

/** 칸 값 저장. 실패하면 던진다(편집기가 오류 문구를 칸 아래에 보인다). */
export type SaveFieldValue = (field: DocumentField, value: string) => Promise<void>

type FieldEditorProps = {
  field: DocumentField
  /** 체크 칸이면 선택지. 없으면 글 칸이다. */
  options?: ChoiceOption[]
  /** 체크 칸이 양식상 하나만 고르는 칸이면 true. 라디오로 보인다. */
  single?: boolean
  onSave: SaveFieldValue
  onClose: () => void
}

/**
 * 양식 안에서 칸을 그 자리에서 고치는 편집기. 서류 양식과 상관없이 칸 id·처리 방식만 보므로
 * 1-3·2-4 어디서나 같다. 표 셀 안(문장 사이)에 들어가므로 구조 요소는 span으로 쓴다.
 * - 글 칸: 다른 곳을 누르거나 Ctrl+Enter를 누르면 저장하고, Esc는 고친 것을 버리고 닫는다.
 * - 체크 칸: 누르는 즉시 저장한다. 하나만 고르는 칸(`single`)은 라디오로 보이고 「선택 해제」가 있다.
 */
export function FieldEditor({ field, options, single, onSave, onClose }: FieldEditorProps) {
  const [error, setError] = useState<string | null>(null)

  async function commit(value: string) {
    setError(null)
    try {
      await onSave(field, value)
    } catch (caught) {
      setError(apiErrorMessage(caught))
      throw caught
    }
  }

  return (
    <span className="block rounded-md border-2 border-primary bg-white p-2 font-sans text-[13px]">
      <span className="mb-1.5 block text-xs font-semibold text-black">{field.label}</span>
      {options ? (
        <ChoiceEditor
          field={field}
          options={options}
          single={single}
          commit={commit}
          onClose={onClose}
        />
      ) : (
        <TextEditor field={field} commit={commit} onClose={onClose} />
      )}
      {error && (
        <span role="alert" className="mt-1.5 block text-xs text-destructive">
          {error}
        </span>
      )}
    </span>
  )
}

type InnerProps = {
  field: DocumentField
  commit: (value: string) => Promise<void>
  onClose: () => void
}

function TextEditor({ field, commit, onClose }: InnerProps) {
  const [draft, setDraft] = useState(field.value)
  const [saving, setSaving] = useState(false)
  const dirty = draft !== field.value

  async function save() {
    if (!dirty || saving) return
    setSaving(true)
    try {
      await commit(draft)
    } catch {
      // 오류 문구는 편집기가 보인다. 쓴 글은 그대로 둔다.
    } finally {
      setSaving(false)
    }
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: 편집기 밖으로 포커스가 나갈 때 저장하려는 경계
    <span
      className="block"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) void save()
      }}
    >
      <Textarea
        // 칸을 누르면 바로 쓸 수 있게 한다.
        autoFocus
        aria-label={`${field.label} 값`}
        value={draft}
        disabled={saving}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setDraft(field.value)
            onClose()
          } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            void save()
          }
        }}
        className="min-h-20 text-[13px] text-black md:text-[13px]"
      />
      <span className="mt-1.5 flex items-center gap-2">
        <Button type="button" size="sm" disabled={!dirty || saving} onClick={() => void save()}>
          {saving ? '저장 중' : '저장'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setDraft(field.value)
            onClose()
          }}
        >
          {dirty ? '고친 것 버리고 닫기' : '닫기'}
        </Button>
        <span className="text-[11px] text-muted-foreground">다른 곳을 누르면 자동 저장돼요</span>
      </span>
    </span>
  )
}

function ChoiceEditor({
  field,
  options,
  single,
  commit,
  onClose,
}: InnerProps & { options: ChoiceOption[]; single?: boolean }) {
  const [saving, setSaving] = useState(false)
  const checked = parseChoice(field.value)

  async function store(next: string[]) {
    // 양식에 나온 선택지 순서를 지켜 저장한다.
    const ordered = options.map((option) => option.id).filter((optionId) => next.includes(optionId))
    setSaving(true)
    try {
      await commit(joinChoice(ordered))
    } catch {
      // 오류 문구는 편집기가 보인다.
    } finally {
      setSaving(false)
    }
  }

  const toggle = (id: string, on: boolean) =>
    store(on ? [...checked, id] : checked.filter((item) => item !== id))

  const closeButton = (
    <span className="mt-1.5 flex items-center gap-1">
      {single && checked.length > 0 && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={saving}
          onClick={() => void store([])}
        >
          선택 해제
        </Button>
      )}
      <Button type="button" size="sm" variant="ghost" onClick={onClose}>
        닫기
      </Button>
    </span>
  )

  if (single) {
    return (
      <>
        <RadioGroup
          aria-label={field.label}
          value={checked[0] ?? ''}
          disabled={saving}
          onValueChange={(id) => void store([id])}
          className="gap-1"
        >
          {options.map((option) => (
            <label
              key={option.id}
              htmlFor={`${field.id}:${option.id}`}
              className="flex items-start gap-2 py-0.5 text-black"
            >
              <RadioGroupItem
                id={`${field.id}:${option.id}`}
                value={option.id}
                className="mt-0.5"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </RadioGroup>
        {closeButton}
      </>
    )
  }

  return (
    <>
      {options.map((option) => (
        <label
          key={option.id}
          htmlFor={`${field.id}:${option.id}`}
          className="flex items-start gap-2 py-0.5 text-black"
        >
          <Checkbox
            id={`${field.id}:${option.id}`}
            checked={checked.includes(option.id)}
            disabled={saving}
            onCheckedChange={(value) => void toggle(option.id, value === true)}
            className="mt-0.5"
          />
          <span>{option.label}</span>
        </label>
      ))}
      {closeButton}
    </>
  )
}
