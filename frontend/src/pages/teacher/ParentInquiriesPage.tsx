import { MessageCircle, Send, Siren } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  type ParentInquiry,
  useParentInbox,
  useParentProcedureEvent,
  useReplyParentInquiry,
  useUpdateParentInquiry,
} from '@/api/parentGuidance.ts'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'

function InquiryCard({ item }: { item: ParentInquiry }) {
  const update = useUpdateParentInquiry()
  const reply = useReplyParentInquiry()
  const [text, setText] = useState('')
  const error = update.error || reply.error
  return (
    <article
      className={`space-y-4 rounded-2xl border bg-card p-5 ${item.urgent ? 'border-destructive/50' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {item.urgent && <Siren className="size-5 text-destructive" />}
            <h2 className="font-bold">{item.guardian}</h2>
            <span
              className={`rounded-full px-2 py-1 text-xs ${item.urgent ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}
            >
              {item.urgent
                ? '긴급 · 즉시 확인'
                : item.status === 'answered'
                  ? '답변 완료'
                  : item.status === 'in_progress'
                    ? '확인 중'
                    : '접수'}
            </span>
            {!item.read && <span className="size-2 rounded-full bg-primary" />}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {item.case_number} · 이전 문의 {item.previous_count}건 ·{' '}
            {new Date(item.at).toLocaleString('ko-KR')}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={update.isPending || item.read}
          onClick={() =>
            update.mutate({
              id: item.id,
              status: item.status === 'received' ? 'in_progress' : item.status,
            })
          }
        >
          {item.read ? '확인함' : '확인 처리'}
        </Button>
      </div>
      {item.urgent && (
        <p className="rounded-xl bg-destructive/5 p-3 text-sm leading-6 text-destructive">
          현재 안전과 보호 필요를 바로 확인해 주세요. 화면 알림만 등록되었으며, 긴급전화·외부
          통보·확인 완료는 수행하지 않았습니다.
        </p>
      )}
      <div className="rounded-xl bg-muted/40 p-4">
        <p className="text-xs font-semibold text-muted-foreground">
          문의 요약 · {item.summary_kind}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.summary}</p>
      </div>
      {item.question !== item.summary && (
        <details>
          <summary className="cursor-pointer text-sm text-primary">문의 원문 보기</summary>
          <p className="mt-2 whitespace-pre-wrap text-sm">{item.question}</p>
        </details>
      )}
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <p>
          <span className="text-muted-foreground">원하는 도움</span>
          <br />
          {item.desired_action || '별도 기재 없음'}
        </p>
        <p>
          <span className="text-muted-foreground">희망 답변</span>
          <br />
          {item.preferred_reply === 'safe_phone'
            ? `안심전화 회신 요청 · ${item.callback_number}`
            : '챗봇 화면 답변'}
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={item.jurisdiction_notified}
          disabled={update.isPending}
          onChange={(e) => update.mutate({ id: item.id, jurisdiction_notified: e.target.checked })}
        />{' '}
        담당 기관·학교 역할 안내 완료
      </label>
      {item.replies.map((r) => (
        <div key={r.id} className="rounded-xl bg-primary/5 p-4">
          <p className="text-xs font-semibold text-primary">
            {r.teacher} · {new Date(r.at).toLocaleString('ko-KR')}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{r.text}</p>
        </div>
      ))}
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          try {
            await reply.mutateAsync({ id: item.id, text })
            setText('')
          } catch {
            /* 오류 표시 */
          }
        }}
      >
        <Textarea
          aria-label={`${item.guardian} 답변`}
          value={text}
          maxLength={3000}
          onChange={(e) => setText(e.target.value)}
          placeholder="학부모에게 전달할 답변을 작성해 주세요. 상대 학생의 개인정보를 포함하지 마세요."
        />
        <Button size="sm" disabled={!text.trim() || reply.isPending}>
          <Send />
          {reply.isPending ? '저장 중…' : '답변 전달'}
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      )}
    </article>
  )
}
export default function ParentInquiriesPage() {
  const inbox = useParentInbox()
  const event = useParentProcedureEvent()
  const [filter, setFilter] = useState<'all' | 'urgent' | 'pending'>('all')
  const [caseId, setCaseId] = useState('')
  const [kind, setKind] = useState<'committee_requested' | 'self_resolution_closed'>(
    'committee_requested',
  )
  const [date, setDate] = useState(new Date().toLocaleDateString('sv-SE'))
  const [confirmed, setConfirmed] = useState(false)
  const profiles = inbox.data?.profiles ?? []
  const cases = Array.from(new Map(profiles.map((p) => [p.case_id, p])).values())
  useEffect(() => {
    if (!caseId && cases[0]) setCaseId(cases[0].case_id)
  }, [caseId, cases])
  const items = (inbox.data?.inquiries ?? []).filter((i) =>
    filter === 'urgent' ? i.urgent : filter === 'pending' ? i.status !== 'answered' : true,
  )
  return (
    <section className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <MessageCircle className="text-primary" /> 학부모 문의함
        </h1>
        <p className="text-sm text-muted-foreground">
          긴급 문의를 우선 확인하고, 학교 안내와 기관 관할을 구분해 답변해 주세요.
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', '전체'],
            ['urgent', '긴급'],
            ['pending', '답변 대기'],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? 'default' : 'outline'}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      {inbox.isPending && <p role="status">학부모 문의를 불러오고 있어요.</p>}
      {inbox.error && (
        <p role="alert" className="text-destructive">
          {inbox.error.message}
        </p>
      )}
      {inbox.isSuccess && items.length === 0 && (
        <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
          해당하는 학부모 문의가 없어요.
        </div>
      )}
      {items.map((item) => (
        <InquiryCard key={item.id} item={item} />
      ))}
      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="font-bold">절차 안내 공지 시연</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          학교에서 정식 절차를 완료한 상황을 가정해 기록합니다. 연결된 양측 가상 보호자 화면에
          안내를 저장하며 실제 교육지원청·문자·전화로 발송하지 않습니다.
        </p>
        <form
          className="grid items-end gap-3 sm:grid-cols-3"
          onSubmit={async (e) => {
            e.preventDefault()
            try {
              await event.mutateAsync({
                case_id: caseId,
                kind,
                date,
                request_id: crypto.randomUUID(),
              })
              setConfirmed(false)
            } catch {
              /* 오류 표시 */
            }
          }}
        >
          <label className="space-y-2 text-sm">
            <span>시연 사안</span>
            <select
              className="h-10 w-full rounded-md border bg-background px-2"
              value={caseId}
              onChange={(e) => {
                setCaseId(e.target.value)
                setConfirmed(false)
                event.reset()
              }}
            >
              {cases.map((p) => (
                <option key={p.case_id} value={p.case_id}>
                  {p.case_number}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span>기록할 절차</span>
            <select
              className="h-10 w-full rounded-md border bg-background px-2"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as typeof kind)
                setConfirmed(false)
                event.reset()
              }}
            >
              <option value="committee_requested">교육지원청 심의 요청 완료</option>
              <option value="self_resolution_closed">학교장 자체해결 종결</option>
            </select>
          </label>
          <label htmlFor="parent-notice-date" className="space-y-2 text-sm">
            <span>해당 일자</span>
            <Input
              id="parent-notice-date"
              type="date"
              value={date}
              required
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="col-span-full flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{' '}
            정식 절차 완료를 가정한 가상 시연임을 확인했어요.
          </label>
          <Button disabled={!caseId || !confirmed || event.isPending} type="submit">
            보호자 안내 기록
          </Button>
        </form>
        {event.isSuccess && (
          <p role="status" className="text-sm text-primary">
            {event.data.message} ({event.data.recipient_count}명)
          </p>
        )}
        {event.error && (
          <p role="alert" className="text-sm text-destructive">
            {event.error.message}
          </p>
        )}
      </section>
      <details className="rounded-2xl border bg-card p-5">
        <summary className="cursor-pointer font-bold">
          챗봇의 담당 기관 안내 이력 ({inbox.data?.guidance_log.length ?? 0})
        </summary>
        <div className="mt-4 space-y-3">
          {inbox.data?.guidance_log.map((entry) => (
            <p
              key={`${entry.actor_id}-${entry.at}-${entry.question}`}
              className="rounded-xl bg-muted/40 p-3 text-sm"
            >
              {new Date(entry.at).toLocaleString('ko-KR')} · {entry.agency} · {entry.contact}
              <br />
              <span className="text-muted-foreground">{entry.question}</span>
            </p>
          ))}
        </div>
      </details>
    </section>
  )
}
