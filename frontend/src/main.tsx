import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import './index.css'
import { queryClient } from '@/lib/queryClient.ts'
import { router } from '@/router.tsx'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('#root 요소를 찾을 수 없습니다.')

/** VITE_USE_MOCK=true면 MSW로 목 API를 켠다. 백엔드 없이도 데모 경로가 동작하게 한다. */
async function enableMocking() {
  if (import.meta.env.VITE_USE_MOCK !== 'true') return
  try {
    const { worker } = await import('@/mocks/browser.ts')
    await worker.start({ onUnhandledFrame: 'bypass' })
  } catch (error) {
    // 서비스 워커를 못 쓰는 환경에서도 앱 자체는 떠야 한다. 이때 요청은 실제 백엔드로 간다.
    console.warn('[MSW] 목 API를 켜지 못해 실제 백엔드로 요청합니다.', error)
  }
}

await enableMocking()

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
)
