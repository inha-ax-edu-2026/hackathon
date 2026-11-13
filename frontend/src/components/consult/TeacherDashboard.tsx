import { Bell, CalendarDays } from 'lucide-react'
import type { ReactNode } from 'react'
import { DocCard } from '@/components/consult/DocCard'
import { KeywordSettings } from '@/components/consult/KeywordSettings'
import { PipelineSteps } from '@/components/consult/PipelineSteps'
import { RiskBadge } from '@/components/consult/RiskBadge'
import { Button } from '@/components/ui/button'
import type { Flow } from '@/hooks/useConsultFlow'
import { savedMinutes, summarize } from '@/lib/consult/mockAi'
import { detect } from '@/lib/consult/model'
import { cn } from '@/lib/utils'

/** 교사가 보는 대시보드: 전환 알림, 학생 양식, 키워드 모니터, AI 요약, 사후 서류 처리. */
export function TeacherDashboard({ flow }: { flow: Flow }) {
  const { state: s } = flow
  const started = s.step === 'chat' || s.step === 'handoff' || s.step === 'docs'
  const det = detect(s.messages, s.keywords)
  // 대화 중에는 실시간 요약, 전환·종료 후에는 확정 요약
  const summary = s.summary ?? (started ? summarize(s.form, s.messages, s.keywords, null) : null)
  const alerted = s.step === 'handoff'
  const booked = s.step === 'booked' && s.slot

  return (
    <div className="space-y-3">
      <p className="text-center text-xs font-medium text-muted-foreground lg:text-left">
        교사 대시보드
      </p>

      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border p-4',
          alerted ? 'animate-pulse border-warning bg-warning-soft/50' : 'bg-muted/40',
        )}
      >
        {booked ? (
          <CalendarDays className="size-6 text-primary" />
        ) : (
          <Bell className={cn('size-6', alerted ? 'text-warning' : 'text-muted-foreground')} />
        )}
        <div className="flex-1 text-sm">
          {alerted && s.handoff ? (
            <>
              <b>새 상담 전환 알림</b> ·{' '}
              {s.handoff.reason === 'student' ? '학생 요청' : '키워드 감지'}
              <p className="text-xs text-muted-foreground">
                {s.handoff.at} · 양식과 대화 요약이 함께 도착했어요
              </p>
            </>
          ) : booked ? (
            <>
              <b>{s.mode === 'inperson' ? '대면' : '비대면'} 상담 등록</b> · {s.form.name} ·{' '}
              {s.slot}
            </>
          ) : (
            <span className="text-muted-foreground">
              {s.step === 'docs' ? '상담 종료 · 기록 저장됨' : '알림 없음'}
            </span>
          )}
        </div>
        {alerted && <Button onClick={flow.completeConsult}>상담 완료 → 서류 생성</Button>}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Panel title="학생 작성 양식" hint={started ? undefined : '학생 작성 대기'}>
          {s.form.name || s.form.concern ? (
            <dl className="space-y-1 text-sm">
              <Row label="학생" value={`${s.form.name} ${s.form.classInfo}`} />
              <Row label="주제" value={s.form.topic} />
              <Row label="기분" value={`${s.form.mood}/5`} />
              <Row label="기간" value={s.form.duration} />
              <Row label="고민" value={s.form.concern} />
              <Row label="바라는 점" value={s.form.wish} />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">아직 작성 전</p>
          )}
        </Panel>

        <Panel title="키워드 모니터" hint={`반복 ${det.count}/${s.keywords.threshold}`}>
          <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full transition-all', det.trigger ? 'bg-destructive' : 'bg-info')}
              style={{ width: `${Math.min(100, (det.count / s.keywords.threshold) * 100)}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-1 text-xs">
            {det.severe.map((k) => (
              <span
                key={k}
                className="rounded bg-destructive-soft px-1.5 py-0.5 text-destructive-strong"
              >
                {k}
              </span>
            ))}
            {[...new Set(det.mild)].map((k) => (
              <span key={k} className="rounded bg-warning-soft px-1.5 py-0.5 text-warning-strong">
                {k}
              </span>
            ))}
            {!det.severe.length && !det.mild.length && (
              <span className="text-muted-foreground">감지 없음</span>
            )}
          </div>
        </Panel>
      </div>

      <Panel
        title="AI 요약"
        hint={summary ? undefined : '상담 시작 후 표시'}
        right={summary && <RiskBadge risk={summary.risk} />}
      >
        {summary ? (
          <>
            <p className="mb-1 text-sm font-semibold">{summary.headline}</p>
            <ul className="list-disc space-y-0.5 pl-4 text-sm">
              {summary.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </Panel>

      {s.step === 'docs' && (
        <Panel title="사후 서류 처리">
          <PipelineSteps stage={s.pipeline.stage} />
          {s.pipeline.docs.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="rounded-md bg-success-soft p-2 text-xs text-success-strong">
                직접 작성 대비 약 {savedMinutes(s.pipeline.docs)}분 절감 (가정치)
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {s.pipeline.docs.map((d) => (
                  <DocCard
                    key={d.id}
                    doc={d}
                    approved={!!s.approved[d.id]}
                    onApprove={() => flow.approve(d.id)}
                    onEdit={(t) => flow.editDoc(d.id, t)}
                  />
                ))}
              </div>
            </div>
          )}
        </Panel>
      )}

      <KeywordSettings config={s.keywords} onChange={flow.setKeywords} />
    </div>
  )
}

type PanelProps = { title: string; hint?: string; right?: ReactNode; children: ReactNode }

function Panel({ title, hint, right, children }: PanelProps) {
  return (
    <section className="rounded-xl border p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {right ?? (hint && <span className="text-xs text-muted-foreground">{hint}</span>)}
      </div>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-16 shrink-0 text-muted-foreground">{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  )
}
