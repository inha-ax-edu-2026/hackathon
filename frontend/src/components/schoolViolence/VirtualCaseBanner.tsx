import { FlaskConical } from 'lucide-react'

/** 시연용 가상 사례 표시. 사안 화면 맨 위에 늘 보인다. */
export function VirtualCaseBanner() {
  return (
    <div
      role="note"
      className="flex items-center gap-2 rounded-lg bg-ai px-4 py-2.5 text-sm font-medium text-white"
    >
      <FlaskConical className="size-4 shrink-0" />
      <span>
        가상 사례 · 시연을 위해 만든 가상의 사안이에요. 학교, 학생, 상담 내용은 모두 실제와 관련이
        없어요.
      </span>
    </div>
  )
}
