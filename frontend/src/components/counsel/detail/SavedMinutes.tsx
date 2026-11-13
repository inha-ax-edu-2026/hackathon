import { Timer } from 'lucide-react'
import type { CaseDocuments } from '@/api/counselTypes.ts'

/** 절감 수치는 서버가 센 값을 그대로 보인다. 근거가 가정치라는 점도 숨기지 않는다. */
export function SavedMinutes({ documents }: { documents: CaseDocuments }) {
  const { saved_minutes, manual_minutes_per_document, review_minutes_per_document } = documents
  const hasSelected = documents.items.some((doc) => doc.selected)
  return (
    <div className="flex items-center gap-3 rounded-lg bg-primary-soft/50 px-4 py-3">
      <Timer className="size-5 shrink-0 text-primary" />
      {hasSelected ? (
        <p>
          <strong className="text-lg font-semibold text-primary">약 {saved_minutes}분 절감</strong>
          <span className="ml-2 text-secondary-foreground">
            · 직접 작성 {manual_minutes_per_document}분 → 검토 {review_minutes_per_document}분
            기준(가정)
          </span>
        </p>
      ) : (
        <p className="text-secondary-foreground">서류를 선택하면 절감되는 시간을 계산해 드려요.</p>
      )}
    </div>
  )
}
