import { ArrowLeft, HeartHandshake, MessageCircle, Send, ShieldCheck } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  type ParentSource,
  useParentInquiry,
  useParentQuestion,
  useParentWorkspace,
} from '@/api/parentGuidance.ts'
import { BackendConnectionButton } from '@/components/counsel/BackendConnection.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'

const ACTORS = [
  { id: 'guardian_victim', label: '피해 관련 보호자 체험' },
  { id: 'guardian_offender', label: '가해 관련 보호자 체험' },
]
const CATEGORY = {
  school: '학교 안내',
  agency: '담당 기관 안내',
  teacher: '교사 확인 필요',
  restricted: '답변 범위 안내',
  emergency: '즉시 안전 확인',
}
function Sources({ sources }: { sources: ParentSource[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {sources.map((s) => (
        <a
          key={s.url}
          className="text-xs text-primary underline underline-offset-2"
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {s.label} ↗
        </a>
      ))}
    </div>
  )
}
export default function ParentGuidancePage() {
  const [actor, setActor] = useState('guardian_victim')
  const workspace = useParentWorkspace(actor)
  const question = useParentQuestion(actor)
  const inquiry = useParentInquiry(actor)
  const [text, setText] = useState('')
  const [inquiryText, setInquiryText] = useState('')
  const [desired, setDesired] = useState('')
  const [method, setMethod] = useState<'chat' | 'safe_phone'>('chat')
  const [phone, setPhone] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const request = useRef({ signature: '', id: '' })
  const inquiryRequest = useRef({ signature: '', id: '' })
  const panel = useRef<HTMLDivElement>(null)
  const data = workspace.data
  async function send(value = text) {
    const clean = value.trim()
    if (!clean || question.isPending) return
    const signature = actor + clean
    if (request.current.signature !== signature)
      request.current = { signature, id: crypto.randomUUID() }
    try {
      await question.mutateAsync({ text: clean, request_id: request.current.id })
      setText('')
      request.current = { signature: '', id: '' }
      setTimeout(
        () => panel.current?.scrollTo({ top: panel.current.scrollHeight, behavior: 'smooth' }),
        150,
      )
    } catch {
      /* 오류를 입력창 아래에 표시한다. */
    }
  }
  function openInquiry(value = '') {
    setInquiryText(value)
    setFormOpen(true)
    inquiry.reset()
  }
  const error = workspace.error || question.error || inquiry.error
  return (
    <section className="space-y-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" /> 시연 홈
        </Link>
        <BackendConnectionButton />
      </div>
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-primary/10 p-3">
            <HeartHandshake className="size-7 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-primary">SAFE-PATH · 학부모 지원</p>
            <h1 className="text-2xl font-bold">학부모 안내 챗봇</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              절차는 쉽게, 확인이 필요한 질문은 담당 교사에게
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => openInquiry()}>
          <MessageCircle /> 교사에게 문의하기
        </Button>
      </header>
      <div className="flex flex-wrap items-center gap-2">
        {ACTORS.map((a) => (
          <Button
            key={a.id}
            variant={actor === a.id ? 'default' : 'outline'}
            size="sm"
            disabled={question.isPending || inquiry.isPending}
            onClick={() => {
              setActor(a.id)
              setFormOpen(false)
              setText('')
              question.reset()
              inquiry.reset()
            }}
          >
            {a.label}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground">
          가상 보호자 시연 · 실제 개인정보는 입력하지 마세요.
        </span>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error.message}
          {workspace.isError && (
            <Button
              className="ml-3"
              size="sm"
              variant="outline"
              onClick={() => void workspace.refetch()}
            >
              다시 연결
            </Button>
          )}
        </p>
      )}
      {workspace.isPending && (
        <p role="status" className="p-8 text-center text-muted-foreground">
          학부모 안내 화면을 불러오고 있어요.
        </p>
      )}
      {data && (
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_300px]">
          <div className="space-y-5">
            <div className="overflow-hidden rounded-2xl border bg-card">
              <div className="flex items-center gap-2 border-b px-5 py-4 font-semibold">
                <MessageCircle className="size-5 text-primary" /> 무엇이 궁금하신가요?
              </div>
              <div
                ref={panel}
                className="max-h-[560px] min-h-[240px] space-y-5 overflow-y-auto p-5"
                aria-live="polite"
                aria-relevant="additions"
              >
                <div className="rounded-xl bg-muted/50 p-4 text-sm leading-7">
                  안녕하세요. 학교폭력 처리 절차와 자녀의 진행 단계를 안내해 드려요. 개별 판단이
                  필요한 내용은 담당 교사에게 연결합니다. 아래 질문을 선택하거나 직접 입력해 주세요.
                </div>
                {data.turns.map((turn) => (
                  <div key={turn.id} className="space-y-3">
                    <div className="ml-10 whitespace-pre-wrap rounded-xl bg-primary/10 p-4 text-sm">
                      {turn.question}
                    </div>
                    <div
                      className={`mr-4 rounded-xl border p-4 ${turn.answer.urgent ? 'border-destructive/40 bg-destructive/5' : 'bg-background'}`}
                    >
                      <span
                        className={`text-xs font-semibold ${turn.answer.urgent ? 'text-destructive' : 'text-primary'}`}
                      >
                        {CATEGORY[turn.answer.category]}
                      </span>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
                        {turn.answer.text}
                      </p>
                      {turn.answer.card?.agency && (
                        <p className="mt-2 text-sm font-medium">
                          {turn.answer.card.agency} · {turn.answer.card.contact}
                        </p>
                      )}
                      {turn.answer.card && <Sources sources={turn.answer.card.sources} />}
                      {turn.inquiry_id && (
                        <p className="mt-3 text-xs font-semibold text-destructive">
                          긴급 알림을 교사 문의함에 등록했어요. 실제 긴급전화는 직접 연결해 주세요.
                        </p>
                      )}
                      {turn.answer.offer_teacher && (
                        <Button
                          className="mt-3"
                          variant="outline"
                          size="sm"
                          onClick={() => openInquiry(turn.question)}
                        >
                          이 내용으로 교사에게 문의
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {question.isPending && (
                  <p role="status" className="text-sm text-muted-foreground">
                    질문을 확인하고 있어요…
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 border-t p-4">
                {[
                  '처리 절차가 궁금해요',
                  '우리 아이 진행 단계',
                  '학생 분리는 어떻게 하나요?',
                  '자체해결 조건',
                  '심의위원회 일정',
                  '치료비 지원',
                ].map((q) => (
                  <button
                    type="button"
                    key={q}
                    disabled={question.isPending}
                    onClick={() => void send(q)}
                    className="rounded-full border bg-background px-3 py-1.5 text-xs hover:border-primary disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <form
                className="flex items-end gap-2 border-t p-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  void send()
                }}
              >
                <Textarea
                  aria-label="학부모 질문"
                  value={text}
                  maxLength={3000}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="궁금한 절차나 필요한 도움을 입력해 주세요."
                  className="min-h-20 resize-none"
                />
                <Button
                  type="submit"
                  disabled={!text.trim() || question.isPending}
                  aria-label="질문 보내기"
                >
                  <Send className="size-4" />
                </Button>
              </form>
            </div>
            {formOpen && (
              <form
                className="space-y-4 rounded-2xl border bg-card p-5"
                onSubmit={async (e) => {
                  e.preventDefault()
                  const signature = JSON.stringify([actor, inquiryText, desired, method, phone])
                  if (inquiryRequest.current.signature !== signature)
                    inquiryRequest.current = { signature, id: crypto.randomUUID() }
                  try {
                    await inquiry.mutateAsync({
                      text: inquiryText,
                      desired_action: desired,
                      preferred_reply: method,
                      callback_number: method === 'safe_phone' ? phone : '',
                      request_id: inquiryRequest.current.id,
                    })
                    inquiryRequest.current = { signature: '', id: '' }
                  } catch {
                    /* 화면에 오류 표시 */
                  }
                }}
              >
                <h2 className="font-bold">교사에게 문의하기</h2>
                <p className="text-xs leading-6 text-muted-foreground">{data.reply_policy}</p>
                <label htmlFor="parent-inquiry-text" className="block space-y-2 text-sm">
                  <span>문의 내용</span>
                  <Textarea
                    id="parent-inquiry-text"
                    value={inquiryText}
                    onChange={(e) => setInquiryText(e.target.value)}
                    required
                    maxLength={3000}
                  />
                </label>
                <label htmlFor="parent-desired-action" className="block space-y-2 text-sm">
                  <span>원하는 도움·조치</span>
                  <Input
                    id="parent-desired-action"
                    value={desired}
                    onChange={(e) => setDesired(e.target.value)}
                    maxLength={500}
                    placeholder="예: 면담 일정 조정, 학교생활 보호 지원"
                  />
                </label>
                <label className="block space-y-2 text-sm">
                  <span>희망 답변 방식</span>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3"
                    value={method}
                    onChange={(e) => setMethod(e.target.value as typeof method)}
                  >
                    <option value="chat">챗봇 화면에서 답변 확인</option>
                    <option value="safe_phone">안심전화 회신 요청</option>
                  </select>
                </label>
                {method === 'safe_phone' && (
                  <label htmlFor="parent-callback-number" className="block space-y-2 text-sm">
                    <span>가상 회신 연락처</span>
                    <Input
                      id="parent-callback-number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="010-0000-0000"
                    />
                    <span className="text-xs text-muted-foreground">
                      회신 요청만 기록하며 실제 전화·번호 가림 서비스는 연결되지 않습니다.
                    </span>
                  </label>
                )}
                {inquiry.isSuccess && (
                  <p role="status" className="text-sm text-primary">
                    {inquiry.data.message}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    disabled={!inquiryText.trim() || inquiry.isPending || inquiry.isSuccess}
                    type="submit"
                  >
                    {inquiry.isPending ? '접수 중…' : '문의 접수'}
                  </Button>
                  <Button variant="outline" type="button" onClick={() => setFormOpen(false)}>
                    닫기
                  </Button>
                </div>
              </form>
            )}
            <section className="space-y-4 rounded-2xl border bg-card p-5">
              <h2 className="font-bold">내 문의·교사 답변</h2>
              {data.inquiries.length === 0 && (
                <p className="text-sm text-muted-foreground">접수한 문의가 없어요.</p>
              )}
              {data.inquiries.map((item) => (
                <article key={item.id} className="space-y-2 rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-primary">
                      {item.urgent
                        ? '긴급 확인 요청'
                        : item.status === 'answered'
                          ? '답변 완료'
                          : '교사 확인 대기'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.at).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{item.question}</p>
                  {item.replies.map((r) => (
                    <div key={r.id} className="rounded-lg bg-primary/5 p-3">
                      <p className="text-xs font-semibold text-primary">{r.teacher} 답변</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{r.text}</p>
                    </div>
                  ))}
                </article>
              ))}
            </section>
          </div>
          <aside className="space-y-5">
            <section className="space-y-4 rounded-2xl border bg-card p-5">
              <h2 className="flex items-center gap-2 font-bold">
                <ShieldCheck className="size-5 text-primary" /> 자녀 진행 안내
              </h2>
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="font-semibold">{data.profile.student.name} 학생</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.profile.school} · {data.profile.student.grade}학년{' '}
                  {data.profile.student.class}반
                </p>
                <p className="mt-1 break-all text-xs">{data.profile.case_number}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                현재 단계와 가능한 후속 경로입니다. 일정 확정은 별도 안내합니다.
              </p>
              <ol className="space-y-3">
                {data.profile.timeline.map((step) => (
                  <li
                    key={step.stage}
                    className={`flex items-center gap-3 text-sm ${step.state === 'current' ? 'font-bold text-primary' : 'text-muted-foreground'}`}
                  >
                    <span
                      className={`size-2 rounded-full ${step.state === 'current' ? 'bg-primary' : 'bg-muted-foreground/25'}`}
                    />
                    {step.label}
                    {step.state === 'current' && <span className="ml-auto text-xs">현재</span>}
                  </li>
                ))}
              </ol>
              <p className="text-xs leading-6 text-muted-foreground">
                본인 자녀의 안내만 표시합니다. 다른 학생의 진술·연락처·상담 기록은 제공하지
                않습니다.
              </p>
            </section>
            <section className="space-y-3 rounded-2xl border bg-card p-5">
              <h2 className="font-bold">학교·기관 안내</h2>
              {data.notices.length === 0 && (
                <p className="text-sm leading-6 text-muted-foreground">
                  새 공지가 없어요. 심의 요청·자체해결 종결 안내가 도착하면 여기에 표시돼요.
                </p>
              )}
              {data.notices.map((n) => (
                <article key={n.id} className="rounded-xl bg-primary/5 p-3">
                  <h3 className="text-sm font-semibold">{n.title}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-6">{n.text}</p>
                  <Sources sources={n.sources} />
                </article>
              ))}
            </section>
            <section className="rounded-2xl border bg-card p-5 text-xs leading-6 text-muted-foreground">
              긴급한 폭력·위협은 112, 학교폭력 신고·상담은 117에 직접 연락해 주세요. 챗봇 문의
              접수는 경찰 신고·교사 확인을 보장하지 않습니다.
            </section>
          </aside>
        </div>
      )}
    </section>
  )
}
