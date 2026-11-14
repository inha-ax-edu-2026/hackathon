import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import './index.css'
import { BackendConnectionGate } from '@/components/counsel/BackendConnection.tsx'
import {
  connectBackend,
  getBackendConnection,
  registerConnectionReset,
  registerMockController,
  requireBackendConnection,
  subscribeBackendConnection,
} from '@/lib/api.ts'
import { STUDENT_COUNSEL_PATH, TEACHER_COUNSEL_PATH } from '@/lib/counsel/paths.ts'
import { queryClient } from '@/lib/queryClient.ts'
import { router } from '@/router.tsx'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('#root 요소를 찾을 수 없습니다.')
rootElement.textContent = '상담 화면을 준비하고 있습니다…'

// 워커는 한 번만 켠다. 목 모드는 모든 핸들러, 백엔드 모드는 백엔드에 없는 사안 API 핸들러만 둔다.
// 나머지 요청은 bypass로 실제 백엔드에 그대로 간다.
let workerReady: Promise<void> | undefined
async function setMocking(enabled: boolean) {
  const [{ worker }, { handlers }, { schoolViolenceHandlers }] = await Promise.all([
    import('@/mocks/browser.ts'),
    import('@/mocks/handlers.ts'),
    import('@/mocks/schoolViolence/handlers.ts'),
  ])
  workerReady ??= worker.start({ onUnhandledFrame: 'bypass' }).then(() => undefined)
  await workerReady
  worker.resetHandlers(...(enabled ? handlers : schoolViolenceHandlers))
}

registerMockController(setMocking)
registerConnectionReset(() => queryClient.clear())
try {
  const initial = getBackendConnection()
  if (initial.mode === 'mock') await setMocking(true)
  else await connectBackend({ baseUrl: initial.baseUrl })
} catch (error) {
  requireBackendConnection(error instanceof Error ? error.message : undefined)
}

// 다른 서버의 상담 ID를 그대로 요청하지 않도록 연결 변경 시 목록으로 돌아간다.
let previousConnection = getBackendConnection()
subscribeBackendConnection(() => {
  const next = getBackendConnection()
  if (previousConnection.mode !== next.mode || previousConnection.baseUrl !== next.baseUrl) {
    const path = window.location.pathname
    void router.navigate(
      path.startsWith('/teacher')
        ? TEACHER_COUNSEL_PATH
        : path.startsWith('/student')
          ? STUDENT_COUNSEL_PATH
          : '/',
    )
  }
  previousConnection = next
})

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BackendConnectionGate>
        <RouterProvider router={router} />
      </BackendConnectionGate>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>,
)
