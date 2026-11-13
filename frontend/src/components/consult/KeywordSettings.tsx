import { useId } from 'react'
import { Input } from '@/components/ui/input'
import type { KeywordConfig } from '@/lib/consult/model'

type KeywordSettingsProps = { config: KeywordConfig; onChange: (config: KeywordConfig) => void }

const parseList = (value: string) =>
  value
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

/** 개인 상담 전환 키워드 편집. 어떤 키워드를 쓸지는 교사 팀이 정하므로 시연 중에도 바꿀 수 있게 둔다. */
export function KeywordSettings({ config, onChange }: KeywordSettingsProps) {
  const id = useId()
  return (
    <details className="rounded-md border bg-background text-xs">
      <summary className="cursor-pointer px-3 py-2 text-muted-foreground">
        전환 키워드 설정 (정의 필요)
      </summary>
      <div className="space-y-2 border-t p-3">
        <div>
          <label htmlFor={`${id}-severe`} className="font-medium">
            즉시 전환 (1회만 나와도)
          </label>
          <Input
            id={`${id}-severe`}
            defaultValue={config.severe.join(', ')}
            onBlur={(e) => onChange({ ...config, severe: parseList(e.target.value) })}
          />
        </div>
        <div>
          <label htmlFor={`${id}-mild`} className="font-medium">
            반복 시 전환
          </label>
          <Input
            id={`${id}-mild`}
            defaultValue={config.mild.join(', ')}
            onBlur={(e) => onChange({ ...config, mild: parseList(e.target.value) })}
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor={`${id}-threshold`} className="font-medium">
            반복 기준 (누적 횟수)
          </label>
          <Input
            id={`${id}-threshold`}
            type="number"
            min={1}
            className="w-16"
            value={config.threshold}
            onChange={(e) =>
              onChange({ ...config, threshold: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </div>
      </div>
    </details>
  )
}
