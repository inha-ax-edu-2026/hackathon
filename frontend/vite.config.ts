/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // 상담 API 계약 테스트: Node에서 msw/node로 목 핸들러를 띄우고 apiFetch로 부른다.
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    // Node의 fetch는 상대 경로를 못 쓰므로 테스트에서만 절대 주소를 준다. 목 핸들러도 같은 주소를 쓴다.
    env: { VITE_API_BASE_URL: 'http://localhost:5173', VITE_USE_MOCK: 'true' },
  },
})
