import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plug } from 'lucide-react'
import {
  type FormEvent,
  Fragment,
  type ReactNode,
  useId,
  useState,
  useSyncExternalStore,
} from 'react'
import { Button } from '@/components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx'
import { Input } from '@/components/ui/input.tsx'
import {
  connectBackend,
  getBackendConnection,
  selectMockBackend,
  subscribeBackendConnection,
} from '@/lib/api.ts'

export function useBackendConnection() {
  return useSyncExternalStore(subscribeBackendConnection, getBackendConnection)
}

function ConnectionForm({ onConnected }: { onConnected?: () => void }) {
  const connection = useBackendConnection()
  const queryClient = useQueryClient()
  const [baseUrl, setBaseUrl] = useState(connection.baseUrl)
  const [frontendKey, setFrontendKey] = useState('')
  const [teacherKey, setTeacherKey] = useState('')
  const id = useId()
  const mutation = useMutation({
    mutationFn: async (mode: 'backend' | 'mock') => {
      await queryClient.cancelQueries()
      if (mode === 'mock') await selectMockBackend()
      else await connectBackend({ baseUrl, frontendKey, teacherKey })
    },
    onSuccess: () => {
      setFrontendKey('')
      setTeacherKey('')
      onConnected?.()
    },
    onError: () => queryClient.invalidateQueries(),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate('backend')
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor={`${id}-url`} className="text-sm font-medium">
          백엔드 주소
        </label>
        <Input
          id={`${id}-url`}
          type="url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://서버주소.trycloudflare.com"
          autoComplete="off"
          required
          disabled={mutation.isPending}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor={`${id}-frontend`} className="text-sm font-medium">
          프론트 연동키
        </label>
        <Input
          id={`${id}-frontend`}
          type="password"
          value={frontendKey}
          onChange={(e) => setFrontendKey(e.target.value)}
          placeholder={
            connection.ready && connection.mode === 'backend'
              ? '같은 서버는 비워두면 기존 키 유지'
              : 'FRONTEND_ACCESS_TOKEN 값'
          }
          autoComplete="off"
          spellCheck={false}
          maxLength={4096}
          disabled={mutation.isPending}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor={`${id}-teacher`} className="text-sm font-medium">
          교사 접속키 <span className="text-muted-foreground">(선택)</span>
        </label>
        <Input
          id={`${id}-teacher`}
          type="password"
          value={teacherKey}
          onChange={(e) => setTeacherKey(e.target.value)}
          placeholder="TEACHER_ACCESS_TOKEN 값"
          autoComplete="off"
          spellCheck={false}
          maxLength={4096}
          disabled={mutation.isPending}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        접속키는 담당자가 별도로 전달한 값을 입력하세요. BAZE API 키를 넣는 곳이 아닙니다. 현재 탭
        메모리에만 두며 새로고침·새 탭에서는 다시 입력합니다.
      </p>
      <p className="text-sm text-muted-foreground">
        가상 학생 자료로 테스트하세요. 연결 확인은 AI를 호출하지 않습니다. 연결 후 상담 전송에는
        서버 설정에 따라 API 사용량이 발생합니다.
      </p>
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate('mock')}
        >
          가상 시연 사용
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? '연결 확인 중…' : '백엔드 연결'}
        </Button>
      </div>
    </form>
  )
}

export function BackendConnectionButton() {
  const [open, setOpen] = useState(false)
  const busy = useIsMutating()
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) setOpen(next)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={busy > 0}>
          <Plug />
          연결 설정
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>시연 연결 설정</DialogTitle>
          <DialogDescription>공유 백엔드에 연결하거나 가상 시연을 선택하세요.</DialogDescription>
        </DialogHeader>
        <ConnectionForm onConnected={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

/** 접속키 입력 전에는 상담 화면을 마운트하지 않아 미인증 폴링을 막는다. */
export function BackendConnectionGate({ children }: { children: ReactNode }) {
  const connection = useBackendConnection()
  if (connection.ready) return <Fragment key={connection.revision ?? 0}>{children}</Fragment>
  return (
    <main className="mx-auto my-12 max-w-lg space-y-6 rounded-xl border bg-card p-6 text-foreground">
      <div className="space-y-2">
        <h1 className="text-xl font-bold">시연 백엔드 연결</h1>
        <p className="text-muted-foreground">서버 주소와 접속키를 확인한 뒤 상담 화면을 엽니다.</p>
      </div>
      <ConnectionForm />
    </main>
  )
}
