import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge.tsx'
import { DetailCard } from './DetailCard.tsx'

type SummaryCardProps = {
  summary: string
  keywords: string[]
}

/** ② 전환 요약 + 감지 키워드. 대화 전문은 교사에게 보이지 않으므로 요약만 보인다. */
export function SummaryCard({ summary, keywords }: SummaryCardProps) {
  return (
    <DetailCard title="AI 요약" icon={<Sparkles className="size-4 text-primary" />}>
      <p className="leading-relaxed whitespace-pre-line">{summary}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
        <span className="text-muted-foreground">감지 키워드</span>
        {keywords.length > 0 ? (
          keywords.map((keyword) => (
            <Badge key={keyword} className="bg-primary-soft text-foreground">
              {keyword}
            </Badge>
          ))
        ) : (
          <span className="text-muted-foreground">없음</span>
        )}
      </div>
    </DetailCard>
  )
}
