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

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
)
