import { useId } from 'react'
import { OptionChip } from '@/components/consult/OptionChip'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DURATIONS, type FormValues, TOPICS } from '@/lib/consult/model'

type ConsultFormProps = { form: FormValues; onChange: (patch: Partial<FormValues>) => void }

const labelClass = 'mb-1 block text-xs font-medium text-muted-foreground'

/** 학생이 직접 작성하는 고정 형식 상담 양식. 항목은 예비교사 팀 전달 후 교체한다. */
export function ConsultForm({ form, onChange }: ConsultFormProps) {
  const id = useId()
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`${id}-name`} className={labelClass}>
            이름 *
          </label>
          <Input
            id={`${id}-name`}
            value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor={`${id}-class`} className={labelClass}>
            학년·반
          </label>
          <Input
            id={`${id}-class`}
            placeholder="2학년 3반"
            value={form.classInfo}
            onChange={(e) => onChange({ classInfo: e.target.value })}
          />
        </div>
      </div>
      <div>
        <span className={labelClass}>상담 주제 *</span>
        <div className="flex flex-wrap gap-1.5">
          {TOPICS.map((t) => (
            <OptionChip key={t} selected={form.topic === t} onClick={() => onChange({ topic: t })}>
              {t}
            </OptionChip>
          ))}
        </div>
      </div>
      <div>
        <span className={labelClass}>요즘 기분 (1 힘듦 ~ 5 좋음)</span>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <OptionChip key={n} selected={form.mood === n} onClick={() => onChange({ mood: n })}>
              {n}
            </OptionChip>
          ))}
        </div>
      </div>
      <div>
        <span className={labelClass}>이 고민이 이어진 기간</span>
        <div className="flex flex-wrap gap-1.5">
          {DURATIONS.map((d) => (
            <OptionChip
              key={d}
              selected={form.duration === d}
              onClick={() => onChange({ duration: d })}
            >
              {d}
            </OptionChip>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-concern`} className={labelClass}>
          고민 내용 *
        </label>
        <Textarea
          id={`${id}-concern`}
          rows={3}
          value={form.concern}
          onChange={(e) => onChange({ concern: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor={`${id}-wish`} className={labelClass}>
          선생님께 바라는 점 (선택)
        </label>
        <Textarea
          id={`${id}-wish`}
          rows={2}
          value={form.wish}
          onChange={(e) => onChange({ wish: e.target.value })}
        />
      </div>
    </div>
  )
}
