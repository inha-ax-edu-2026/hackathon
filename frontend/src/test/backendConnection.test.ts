import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiFetch, connectBackend, getBackendConnection, selectMockBackend } from '@/lib/api.ts'
import { server } from '@/mocks/node.ts'

const BASE = 'http://localhost:8001'
const HEALTH = {
  status: 'ok',
  integration_contract: 'document-demo-v1',
  frontend_demo_enabled: true,
  frontend_ai_mode: 'baze',
  quality_model: 'test-quality-model',
  access_key_required: false,
}
function backend() {
  server.use(
    http.get(`${BASE}/health`, () => HttpResponse.json(HEALTH)),
    http.get(`${BASE}/api/student/counsel/cases`, ({ request }) => {
      expect(request.headers.get('X-Frontend-Access')).toBeNull()
      expect(request.headers.get('X-Teacher-Key')).toBeNull()
      return HttpResponse.json({ cases: [] })
    }),
  )
}
const connect = () => connectBackend({ baseUrl: BASE })
describe('접속키 없는 백엔드 연결', () => {
  it('주소만으로 연결하고 상담 본문과 재시도 ID를 유지한다', async () => {
    backend()
    await connect()
    server.use(
      http.post(`${BASE}/api/student/counsel/cases/test/messages`, async ({ request }) => {
        expect(request.headers.get('X-Frontend-Access')).toBeNull()
        expect(request.headers.get('X-Teacher-Key')).toBeNull()
        expect(request.headers.get('X-Test')).toBe('kept')
        expect(await request.json()).toEqual({ text: '가상 상담', request_id: 'same-id' })
        return HttpResponse.json({ bot_message: { text: '서버 응답' } })
      }),
    )
    const result = await apiFetch<{ bot_message: { text: string } }>(
      '/api/student/counsel/cases/test/messages',
      {
        method: 'POST',
        headers: new Headers({ 'X-Test': 'kept' }),
        body: { text: '가상 상담', request_id: 'same-id' },
      },
    )
    expect(result.bot_message.text).toBe('서버 응답')
  })
  it('교사 상담과 보관 기록도 접속키 없이 요청한다', async () => {
    backend()
    await connect()
    for (const route of ['/api/teacher/counsel/cases', '/api/teacher/reports']) {
      server.use(
        http.get(BASE + route, ({ request }) => {
          expect(request.headers.get('X-Frontend-Access')).toBeNull()
          expect(request.headers.get('X-Teacher-Key')).toBeNull()
          return HttpResponse.json({ items: [] })
        }),
      )
      expect(await apiFetch(route)).toEqual({ items: [] })
    }
  })
  it('이전 접속키 헤더가 남아 있어도 전송하지 않는다', async () => {
    backend()
    await connect()
    expect(
      await apiFetch('/api/student/counsel/cases', {
        headers: { 'X-Frontend-Access': 'stale', 'X-Teacher-Key': 'stale' },
      }),
    ).toEqual({ cases: [] })
  })
  it('구버전 서버의 인증 오류는 재시작 안내로 표시한다', async () => {
    backend()
    server.use(
      http.get(`${BASE}/api/student/counsel/cases`, () =>
        HttpResponse.json({ detail: 'old auth' }, { status: 403 }),
      ),
    )
    await expect(connect()).rejects.toMatchObject({
      status: 403,
      message: expect.stringContaining('재시작'),
    })
    expect(getBackendConnection().mode).toBe('mock')
  })
  it('HTML 오류를 JSON 구문 오류 대신 API 오류로 표시한다', async () => {
    backend()
    await connect()
    server.use(
      http.get(
        `${BASE}/api/teacher/reports`,
        () => new HttpResponse('<html>private text</html>', { status: 503 }),
      ),
    )
    await expect(apiFetch('/api/teacher/reports')).rejects.toMatchObject({
      status: 503,
      body: { detail: expect.stringContaining('백엔드 주소') },
    })
  })
  it('서버 주소와 모드를 새 탭에서 재사용할 수 있도록 기억한다', async () => {
    backend()
    await connect()
    expect(getBackendConnection()).toMatchObject({ mode: 'backend', baseUrl: BASE, ready: true })
    const saved = Array.from({ length: localStorage.length }, (_, i) =>
      localStorage.getItem(localStorage.key(i) ?? ''),
    )
    expect(saved.some((v) => v?.includes(BASE))).toBe(true)
    expect(JSON.stringify(getBackendConnection())).not.toContain('frontendKey')
  })
  it('외부 URL·상위 경로와 HTTP 원격 주소를 거부한다', async () => {
    backend()
    await connect()
    await expect(apiFetch('https://other.example/api/teacher/reports')).rejects.toMatchObject({
      status: 0,
    })
    await expect(apiFetch('/api/%2e%2e/health')).rejects.toMatchObject({ status: 0 })
    await expect(connectBackend({ baseUrl: 'http://remote.example' })).rejects.toMatchObject({
      status: 0,
    })
  })
  it('연결 전환 뒤 도착한 이전 서버 응답은 사용하지 않는다', async () => {
    backend()
    await connect()
    let release: () => void = () => {}
    let accepted: () => void = () => {}
    const started = new Promise<void>((resolve) => {
      accepted = resolve
    })
    server.use(
      http.get(`${BASE}/api/teacher/reports/slow`, async () => {
        await new Promise<void>((resolve) => {
          release = resolve
          accepted()
        })
        return HttpResponse.json({ old: true })
      }),
    )
    const pending = apiFetch('/api/teacher/reports/slow')
    await started
    await selectMockBackend()
    release()
    await expect(pending).rejects.toMatchObject({ status: 409 })
  })
  it('취소한 조회는 원래 취소 오류를 유지한다', async () => {
    backend()
    await connect()
    const controller = new AbortController()
    controller.abort()
    await expect(
      apiFetch('/api/student/counsel/cases', { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})
