import { FileText } from 'lucide-react'
import type { CounselForm } from '@/api/counselTypes.ts'
import { DetailCard } from './DetailCard.tsx'

/** ③ 상담 양식: 학생이 쓴 질문·답. */
export function FormCard({ form }: { form: CounselForm }) {
  return (
    <DetailCard title="상담 양식" icon={<FileText className="size-4 text-muted-foreground" />}>
      <dl className="divide-y">
        <div className="grid grid-cols-[12rem_1fr] gap-4 py-3 first:pt-0">
          <dt className="text-muted-foreground">상담 주제</dt>
          <dd>{form.topic}</dd>
        </div>
        {form.answers.map(({ question, answer }) => (
          <div key={question} className="grid grid-cols-[12rem_1fr] gap-4 py-3 last:pb-0">
            <dt className="text-muted-foreground">{question}</dt>
            <dd className="whitespace-pre-line">{answer || '-'}</dd>
          </div>
        ))}
      </dl>
    </DetailCard>
  )
}
