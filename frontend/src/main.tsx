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

/**
 * 목 API를 켤지 정한다. VITE_USE_MOCK=true면 켜고, false면 끈다.
 * 비어 있으면 백엔드 주소(VITE_API_BASE_URL)가 없을 때 켠다. 주소 없이 끄면 요청이 정적 호스팅
 * (Vercel 등)으로 가서 POST가 405로 실패하므로, 환경변수를 빠뜨린 배포에서도 데모 경로가 돌게 한다.
 */
function shouldMock() {
  const { VITE_USE_MOCK, VITE_API_BASE_URL } = import.meta.env
  if (VITE_USE_MOCK === 'true') return true
  if (VITE_USE_MOCK === 'false') return false
  return !VITE_API_BASE_URL
}

/** 목 API가 켜져 있으면 MSW를 시작한다. 백엔드 없이도 데모 경로가 동작하게 한다. */
async function enableMocking() {
  if (!shouldMock()) return
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
