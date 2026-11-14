import { Plus, Trash2 } from 'lucide-react'
import { type ReactNode, useId, useState } from 'react'
import { useUpdateSchoolViolenceInfo } from '@/api/schoolViolence.ts'
import type { SchoolViolenceInfo } from '@/api/schoolViolenceTypes.ts'
import { Button } from '@/components/ui/button.tsx'
import { Checkbox } from '@/components/ui/checkbox.tsx'
import { Input } from '@/components/ui/input.tsx'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.tsx'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet.tsx'
import { apiErrorMessage } from '@/lib/schoolViolence/errors.ts'
import { SEPARATION_EXCEPTIONS } from '@/lib/schoolViolence/forms/options.ts'
import {
  emptyStudentDraft,
  type InfoDraft,
  type SeparationChoice,
  type StudentDraft,
  toInfoDraft,
  toInfoRequest,
} from '@/lib/schoolViolence/infoForm.ts'
import { GENDER_LABEL, ROLE_LABEL } from '@/lib/schoolViolence/labels.ts'

type CaseInfoEditSheetProps = {
  caseId: string
  info: SchoolViolenceInfo
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * 사안 정보 편집 패널. 사안번호·책임교사·교감·분리 시행·관련 학생을 한 곳에서 고친다.
 * 서류의 사안 정보 칸은 읽기 전용이라 여기서 고치면 이미 만든 서류에도 바로 반영된다.
 * 열 때마다 서버 값으로 입력을 새로 시작한다(내용이 닫혀 있으면 그려지지 않는다).
 */
export function CaseInfoEditSheet({ caseId, info, open, onOpenChange }: CaseInfoEditSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>사안 정보 고치기</SheetTitle>
          <SheetDescription>
            여기서 고치면 접수보고서·조사보고서의 사안 정보 칸에 바로 반영돼요.
          </SheetDescription>
        </SheetHeader>
        <EditForm caseId={caseId} info={info} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

function EditForm({
  caseId,
  info,
  onDone,
}: {
  caseId: string
  info: SchoolViolenceInfo
  onDone: () => void
}) {
  const [draft, setDraft] = useState<InfoDraft>(() => toInfoDraft(info))
  const update = useUpdateSchoolViolenceInfo(caseId)
  const patch = (changes: Partial<InfoDraft>) => setDraft((prev) => ({ ...prev, ...changes }))
  const patchStudent = (key: string, changes: Partial<StudentDraft>) =>
    patch({
      students: draft.students.map((s) => (s.key === key ? { ...s, ...changes } : s)),
    })

  function save() {
    update.mutate(toInfoRequest(draft), { onSuccess: onDone })
  }

  return (
    <>
      <div className="flex-1 space-y-6 overflow-y-auto px-4">
        <section className="grid gap-3 sm:grid-cols-3">
          <Field label="사안번호">
            <Input
              value={draft.caseNumber}
              onChange={(e) => patch({ caseNumber: e.target.value })}
              placeholder="2026-27"
            />
          </Field>
          <Field label="책임교사">
            <Input
              value={draft.teacherName}
              onChange={(e) => patch({ teacherName: e.target.value })}
            />
          </Field>
          <Field label="교감">
            <Input
              value={draft.vicePrincipal}
              onChange={(e) => patch({ vicePrincipal: e.target.value })}
            />
          </Field>
        </section>

        <SeparationSection draft={draft} patch={patch} />

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-secondary-foreground">
            관련 학생 {draft.students.length}명
          </h3>
          <ul className="space-y-3">
            {draft.students.map((student) => (
              <StudentEditor
                key={student.key}
                student={student}
                onChange={(changes) => patchStudent(student.key, changes)}
                onRemove={() =>
                  patch({ students: draft.students.filter((s) => s.key !== student.key) })
                }
              />
            ))}
          </ul>
          <Button
            variant="outline"
            size="sm"
            onClick={() => patch({ students: [...draft.students, emptyStudentDraft()] })}
          >
            <Plus /> 조사 중 확인된 학생 추가
          </Button>
        </section>
      </div>

      <SheetFooter className="border-t">
        {update.error && (
          <p role="alert" className="text-sm text-destructive">
            {apiErrorMessage(update.error)}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onDone} disabled={update.isPending}>
            취소
          </Button>
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? '저장하는 중' : '저장'}
          </Button>
        </div>
      </SheetFooter>
    </>
  )
}

/** 라벨 + 입력. 라벨을 누르면 입력창으로 간다. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: 입력창이 자식으로 들어간다
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

/** 체크·라디오 한 개와 글. 글을 눌러도 선택된다. */
function Choice({ children }: { children: ReactNode }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: 선택 단추가 자식으로 들어간다
    <label className="flex items-center gap-2 text-sm">{children}</label>
  )
}

const SEPARATION_CHOICES: { value: SeparationChoice; label: string }[] = [
  { value: 'unset', label: '아직 정하지 않음' },
  { value: 'enforced', label: '시행' },
  { value: 'not_enforced', label: '미시행' },
]

function SeparationSection({
  draft,
  patch,
}: {
  draft: InfoDraft
  patch: (changes: Partial<InfoDraft>) => void
}) {
  const id = useId()
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-secondary-foreground">
        가해 관련 학생과 피해 관련 학생 분리
      </h3>
      <RadioGroup
        value={draft.separation}
        onValueChange={(value) => patch({ separation: value as SeparationChoice })}
        className="flex flex-wrap gap-4"
        aria-label="분리 시행 여부"
      >
        {SEPARATION_CHOICES.map(({ value, label }) => (
          <Choice key={value}>
            <RadioGroupItem value={value} /> {label}
          </Choice>
        ))}
      </RadioGroup>
      {draft.separation === 'enforced' && (
        <Field label="분리 기간">
          <Input
            value={draft.separationPeriod}
            onChange={(e) => patch({ separationPeriod: e.target.value })}
            placeholder="2026. 11. 16. ~ 11. 27."
          />
        </Field>
      )}
      {draft.separation === 'not_enforced' && (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm text-muted-foreground">분리 예외 사유</legend>
          {SEPARATION_EXCEPTIONS.map((option) => {
            const checkId = `${id}-${option.id}`
            const checked = draft.exceptionReasons.includes(option.id)
            return (
              <div key={option.id} className="flex items-start gap-2 text-sm">
                <Checkbox
                  id={checkId}
                  checked={checked}
                  onCheckedChange={(next) =>
                    patch({
                      exceptionReasons:
                        next === true
                          ? [...draft.exceptionReasons, option.id]
                          : draft.exceptionReasons.filter((reason) => reason !== option.id),
                    })
                  }
                  className="mt-0.5"
                />
                <label htmlFor={checkId} className="cursor-pointer">
                  {option.label}
                </label>
              </div>
            )
          })}
        </fieldset>
      )}
    </section>
  )
}

function StudentEditor({
  student,
  onChange,
  onRemove,
}: {
  student: StudentDraft
  onChange: (changes: Partial<StudentDraft>) => void
  onRemove: () => void
}) {
  const label = student.name || '새 학생'
  return (
    <li className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{label}</span>
        <Button variant="ghost" size="icon-sm" aria-label={`${label} 빼기`} onClick={onRemove}>
          <Trash2 />
        </Button>
      </div>

      <div className="grid grid-cols-[1fr_4.5rem_4.5rem_4.5rem] gap-3">
        <Field label="이름">
          <Input
            value={student.name}
            onChange={(e) => onChange({ name: e.target.value })}
            readOnly={student.existing}
            title={
              student.existing
                ? '이름은 서류에서 학생을 구별하는 기준이라 고칠 수 없어요.'
                : undefined
            }
            className="read-only:bg-muted"
          />
        </Field>
        <Field label="학년">
          <Input
            type="number"
            min={1}
            value={student.grade}
            onChange={(e) => onChange({ grade: e.target.value })}
          />
        </Field>
        <Field label="반">
          <Input
            type="number"
            min={1}
            value={student.class}
            onChange={(e) => onChange({ class: e.target.value })}
          />
        </Field>
        <Field label="번호">
          <Input
            type="number"
            min={1}
            value={student.number}
            onChange={(e) => onChange({ number: e.target.value })}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <RadioGroup
          value={student.role}
          onValueChange={(value) => onChange({ role: value as StudentDraft['role'] })}
          className="flex gap-4"
          aria-label={`${label} 구분`}
        >
          {(Object.keys(ROLE_LABEL) as StudentDraft['role'][]).map((role) => (
            <Choice key={role}>
              <RadioGroupItem value={role} /> {ROLE_LABEL[role]}
            </Choice>
          ))}
        </RadioGroup>
        <RadioGroup
          value={student.gender}
          onValueChange={(value) => onChange({ gender: value as StudentDraft['gender'] })}
          className="flex gap-4"
          aria-label={`${label} 성별`}
        >
          {(Object.keys(GENDER_LABEL) as StudentDraft['gender'][]).map((gender) => (
            <Choice key={gender}>
              <RadioGroupItem value={gender} /> {GENDER_LABEL[gender]}
            </Choice>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Choice>
          <Checkbox
            checked={student.notified}
            onCheckedChange={(next) => onChange({ notified: next === true })}
          />
          보호자에게 통보함
        </Choice>
        {student.notified && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="통보 일시">
              <Input
                type="datetime-local"
                value={student.noticeAt}
                onChange={(e) => onChange({ noticeAt: e.target.value })}
              />
            </Field>
            <Field label="통보 방법">
              <Input
                value={student.noticeMethod}
                onChange={(e) => onChange({ noticeMethod: e.target.value })}
                placeholder="유선"
              />
            </Field>
          </div>
        )}
      </div>

      <Field label="비고 (장애학생·이주배경학생 등)">
        <Input value={student.note} onChange={(e) => onChange({ note: e.target.value })} />
      </Field>
      <Choice>
        <Checkbox
          checked={student.foundDuringInvestigation}
          onCheckedChange={(next) => onChange({ foundDuringInvestigation: next === true })}
        />
        조사 중에 확인된 학생
      </Choice>
    </li>
  )
}
