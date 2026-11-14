import { ExternalLink, GraduationCap, Presentation, RotateCcw } from 'lucide-react'
import { useResetDemo } from '@/api/demo.ts'
import {
  BackendConnectionButton,
  useBackendConnection,
} from '@/components/counsel/BackendConnection.tsx'
import { Button } from '@/components/ui/button.tsx'
import { STUDENT_COUNSEL_PATH, TEACHER_COUNSEL_PATH } from '@/lib/counsel/paths.ts'

const SCREENS = [
  {
    label: '학생 화면 열기',
    to: STUDENT_COUNSEL_PATH,
    icon: GraduationCap,
    hint: '내 상담 → AI 챗봇 상담',
  },
  {
    label: '교사 화면 열기',
    to: TEACHER_COUNSEL_PATH,
    icon: Presentation,
    hint: '개인상담 관리 → 상담 건 상세',
  },
]

/** 시연 런처(`/`). 발표자가 학생·교사 화면을 새 탭으로 열고, 시연 상태를 시드로 되돌린다. */
function DemoLauncherPage() {
  const reset = useResetDemo()
  const connection = useBackendConnection()

  return (
    <section className="mx-auto flex max-w-xl flex-col gap-6 py-12">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">AI 챗봇 상담 시연</h1>
        <p className="text-muted-foreground">
          학생 화면과 교사 화면을 각각 새 탭으로 열어 나란히 띄워 주세요.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-5">
        <div className="space-y-1">
          <p className="font-semibold">
            {connection.mode === 'mock' ? '가상 시연 데이터 사용 중' : '백엔드 연결됨'}
          </p>
          <p className="break-all text-sm text-muted-foreground">
            {connection.mode === 'backend'
              ? `${connection.baseUrl} · ${connection.aiMode === 'baze' ? connection.model : '서버 모의 응답'}`
              : '실제 API 연결은 연결 설정에서 선택하세요.'}
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

      <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-5">
        <div className="space-y-1">
          <p className="font-semibold">시연 초기화</p>
          <p className="text-muted-foreground">
            모든 상담 건을 지우고 기존 개인상담 건만 남겨요. 열린 탭은 잠시 뒤 따라와요.
          </p>
          <p role="status" className="min-h-5 text-success">
            {reset.isSuccess && '초기화했어요.'}
            {reset.isError && <span className="text-destructive">초기화하지 못했어요.</span>}
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
