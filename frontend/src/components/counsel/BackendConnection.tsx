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
  const id = useId()
  const mutation = useMutation({
    mutationFn: async (mode: 'backend' | 'mock') => {
      await queryClient.cancelQueries()
      if (mode === 'mock') await selectMockBackend()
      else await connectBackend({ baseUrl })
    },
    onSuccess: () => {
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
      <p className="text-sm text-muted-foreground">
        서버 주소는 미리 설정되어 있습니다. 주소가 바뀌었을 때만 수정하세요. 접속키는 필요하지
        않습니다.
      </p>
      <p className="text-sm text-muted-foreground">
        가상 학생 자료로 테스트하세요. 연결 확인은 AI를 호출하지 않습니다.
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

/** 서버 연결이 확인된 뒤 상담 화면을 연다. */
export function BackendConnectionGate({ children }: { children: ReactNode }) {
  const connection = useBackendConnection()
  if (connection.ready) return <Fragment key={connection.revision ?? 0}>{children}</Fragment>
  return (
    <main className="mx-auto my-12 max-w-lg space-y-6 rounded-xl border bg-card p-6 text-foreground">
      <div className="space-y-2">
        <h1 className="text-xl font-bold">시연 백엔드 연결</h1>
        <p className="text-muted-foreground">
          {connection.error ||
            '설정된 서버에 연결하지 못했습니다. 서버 실행 상태를 확인하거나 가상 시연을 선택하세요.'}
        </p>
      </div>
      <ConnectionForm />
    </main>
  )
}
