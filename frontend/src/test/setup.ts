import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { apiFetch, selectMockBackend } from '@/lib/api.ts'
import { server } from '@/mocks/node.ts'
import { MemoryStorage } from './memoryStorage.ts'

// 목 저장소는 브라우저처럼 localStorage에 읽고 쓴다. Node에는 없으므로 메모리 Storage를 끼운다.
vi.stubGlobal('localStorage', new MemoryStorage())
vi.stubGlobal('sessionStorage', new MemoryStorage())

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// 테스트마다 시연 초기화로 저장소를 시드 상태로 되돌린다. 실제 backend에도 같은 API가 있다.
beforeEach(async () => {
  await selectMockBackend()
  await apiFetch('/api/demo/reset', { method: 'POST' })
})
