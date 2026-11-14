import { ExternalLink, GraduationCap, Presentation, RotateCcw, UsersRound } from 'lucide-react'
import { useResetDemo } from '@/api/demo.ts'
import {
  BackendConnectionButton,
  useBackendConnection,
} from '@/components/counsel/BackendConnection.tsx'
import { Button } from '@/components/ui/button.tsx'

const SCREENS = [
  {
    label: '학생 화면 열기',
    to: '/student',
    icon: GraduationCap,
    hint: '학폭 상담 → AI 챗봇 상담',
  },
  {
    label: '교사 화면 열기',
    to: '/teacher',
    icon: Presentation,
    hint: '학교폭력 관리 → 학폭 상담 관리',
  },
]

/** 시연 런처(`/`). 발표자가 학생·학부모·교사 화면을 새 탭으로 열고, 시연 상태를 시드로 되돌린다. */
function DemoLauncherPage() {
  const reset = useResetDemo()
  const connection = useBackendConnection()

  return (
    <section className="mx-auto flex max-w-xl flex-col gap-6 py-12">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">AI 챗봇 상담 시연</h1>
        <p className="text-muted-foreground">시연할 화면을 새 탭으로 열어요.</p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-5">
        <div className="space-y-1">
          <p className="font-semibold">
            {connection.mode === 'mock'
              ? '가상 시연 데이터 사용 중'
              : connection.ready
                ? '백엔드 연결됨'
                : '백엔드 미연결'}
          </p>
          <p className="break-all text-sm text-muted-foreground">
            {connection.mode === 'mock'
              ? '실제 API 연결은 연결 설정에서 선택하세요.'
              : connection.ready
                ? `${connection.baseUrl} · ${connection.aiMode === 'baze' ? connection.model : '서버 모의 응답'}`
                : '학생·교사 시연은 연결 설정에서 가상 시연을 선택할 수 있어요.'}
          </p>
        </div>
        <BackendConnectionButton />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SCREENS.map(({ label, to, icon: Icon, hint }) => (
          <a
            key={to}
            href={to}
            target="_blank"
            rel="noopener"
            className="group flex flex-col gap-3 rounded-xl border bg-card p-5 transition-colors hover:border-primary"
          >
            <Icon className="size-6 text-primary" />
            <span className="flex items-center gap-1 text-base font-semibold">
              {label}
              <ExternalLink className="size-4 text-muted-foreground group-hover:text-primary" />
            </span>
            <span className="text-muted-foreground">{hint}</span>
          </a>
        ))}
      </div>

      <a
        href="/parent"
        target="_blank"
        rel="noopener"
        className="group flex items-center gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-primary"
      >
        <UsersRound className="size-7 shrink-0 text-primary" />
        <div className="space-y-2">
          <span className="flex items-center gap-1 text-base font-semibold">
            학부모 화면 열기
            <ExternalLink className="size-4 text-muted-foreground group-hover:text-primary" />
          </span>
          <p className="text-muted-foreground">
            학교폭력 안내 챗봇 · 자녀 진행 단계 · 교사 문의·답변
          </p>
        </div>
      </a>
      <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-5">
        <div className="space-y-1">
          <p className="font-semibold">시연 초기화</p>
          <p className="text-muted-foreground">
            상담과 사안 데이터를 시연 시작 상태로 되돌려요. 열린 탭에도 잠시 뒤 반영돼요.
          </p>
          <p role="status" className="min-h-5 text-success">
            {reset.isSuccess &&
              (reset.data === 'parent' ? '학부모 대화를 초기화했어요.' : '초기화했어요.')}
            {reset.isError && <span className="text-destructive">{reset.error.message}</span>}
          </p>
        </div>
        <Button variant="outline" onClick={() => reset.mutate()} disabled={reset.isPending}>
          <RotateCcw />
          시연 초기화
        </Button>
      </div>
    </section>
  )
}

export default DemoLauncherPage
