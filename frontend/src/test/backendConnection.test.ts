import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiFetch, connectBackend, getBackendConnection, selectMockBackend } from '@/lib/api.ts'
import { server } from '@/mocks/node.ts'

// 가짜 외부 HTTPS 호스트를 쓰면 실행 환경의 프록시 CONNECT까지 가로챌 수 있다.
// MSW 계약 테스트는 별도 loopback 주소에서 실제 네트워크 없이 실행한다.
const BASE = 'http://localhost:8001'
const FRONTEND_KEY = 'test-frontend-access-key-00001'
const TEACHER_KEY = 'test-teacher-access-key-00001'
const HEALTH = {
  status: 'ok',
  integration_contract: 'document-demo-v1',
  frontend_demo_enabled: true,
  frontend_ai_mode: 'baze',
  quality_model: 'test-quality-model',
}

function backend() {
  server.use(
    http.get(`${BASE}/health`, ({ request }) => {
      expect(request.headers.get('X-Frontend-Access')).toBeNull()
      expect(request.headers.get('X-Teacher-Key')).toBeNull()
      return HttpResponse.json(HEALTH)
    }),
    http.get(`${BASE}/api/student/counsel/cases`, ({ request }) =>
      request.headers.get('X-Frontend-Access') === FRONTEND_KEY
        ? HttpResponse.json({ cases: [] })
        : HttpResponse.json({ detail: '인증 실패' }, { status: 403 }),
    ),
    http.get(`${BASE}/api/teacher/reports`, ({ request }) =>
      request.headers.get('X-Teacher-Key') === TEACHER_KEY
        ? HttpResponse.json({ items: [] })
        : HttpResponse.json({ detail: '교사 인증 실패' }, { status: 401 }),
    ),
  )
}

const connect = () =>
  connectBackend({ baseUrl: `${BASE}/`, frontendKey: FRONTEND_KEY, teacherKey: TEACHER_KEY })

describe('실제 백엔드 연결 계약', () => {
  it('상담 본문과 request_id를 유지하고 Headers 객체와 인증 헤더를 함께 보낸다', async () => {
    backend()
    await connect()
    server.use(
      http.post(`${BASE}/api/student/counsel/cases/test/messages`, async ({ request }) => {
        expect(request.headers.get('X-Frontend-Access')).toBe(FRONTEND_KEY)
        expect(request.headers.get('X-Teacher-Key')).toBeNull()
        expect(request.headers.get('X-Test')).toBe('kept')
        expect(await request.json()).toEqual({ text: '가상 상담', request_id: 'same-retry-id' })
        return HttpResponse.json({ bot_message: { text: '백엔드 응답' } })
      }),
    )
    const response = await apiFetch<{ bot_message: { text: string } }>(
      '/api/student/counsel/cases/test/messages',
      {
        method: 'POST',
        headers: new Headers({ 'X-Test': 'kept' }),
        body: { text: '가상 상담', request_id: 'same-retry-id' },
      },
    )
    expect(response.bot_message.text).toBe('백엔드 응답')
  })

  it('교사 상담은 프론트키, 별도 교사 기록은 교사키로 요청한다', async () => {
    backend()
    await connect()
    server.use(
      http.get(`${BASE}/api/teacher/counsel/cases`, ({ request }) => {
        expect(request.headers.get('X-Frontend-Access')).toBe(FRONTEND_KEY)
        expect(request.headers.get('X-Teacher-Key')).toBeNull()
        return HttpResponse.json({ cases: [] })
      }),
    )
    expect(await apiFetch('/api/teacher/counsel/cases')).toEqual({ cases: [] })
    expect(await apiFetch('/api/teacher/reports')).toEqual({ items: [] })
  })

  it('틀린 프론트키로 연결을 확정하지 않고 기존 가상 시연을 유지한다', async () => {
    backend()
    await expect(
      connectBackend({ baseUrl: BASE, frontendKey: 'test-incorrect-access-key-0001' }),
    ).rejects.toMatchObject({ status: 403 })
    expect(getBackendConnection().mode).toBe('mock')
    const list = await apiFetch<{ cases: unknown[] }>('/api/student/counsel/cases')
    expect(list.cases.length).toBeGreaterThan(0)
  })

  it('선택 입력한 교사키가 잘못된 경우도 연결을 확정하지 않는다', async () => {
    backend()
    await expect(
      connectBackend({
        baseUrl: BASE,
        frontendKey: FRONTEND_KEY,
        teacherKey: 'test-wrong-teacher-key-0001',
      }),
    ).rejects.toMatchObject({ status: 401 })
    expect(getBackendConnection().mode).toBe('mock')
  })

  it('HTML 오류를 JSON 문법 오류 대신 API 오류로 표시하고 원문은 노출하지 않는다', async () => {
    backend()
    await connect()
    server.use(
      http.get(
        `${BASE}/api/teacher/counsel/cases`,
        () => new HttpResponse('<html>private upstream text</html>', { status: 503 }),
      ),
    )
    await expect(apiFetch('/api/teacher/counsel/cases')).rejects.toMatchObject({
      status: 503,
      body: { detail: expect.stringContaining('백엔드 주소') },
    })
  })

  it('다른 앱의 성공 응답을 SAFE-PATH 백엔드로 오인하지 않는다', async () => {
    backend()
    server.use(http.get(`${BASE}/health`, () => HttpResponse.json({ status: 'ok' })))
    await expect(connect()).rejects.toMatchObject({ status: 503 })
    expect(getBackendConnection().mode).toBe('mock')
  })

  it('공개 상태·브라우저 저장소에 접속키를 남기지 않는다', async () => {
    backend()
    await connect()
    const saved = Array.from({ length: sessionStorage.length }, (_, i) =>
      sessionStorage.getItem(sessionStorage.key(i) ?? ''),
    )
    const visible = JSON.stringify({ connection: getBackendConnection(), saved })
    expect(visible).not.toContain(FRONTEND_KEY)
    expect(visible).not.toContain(TEACHER_KEY)
    expect(visible).toContain(BASE)
  })

  it('다른 서버로 주소를 바꿀 때 기존 키를 재사용하지 않는다', async () => {
    backend()
    await connect()
    await expect(
      connectBackend({ baseUrl: 'https://other.example', frontendKey: '' }),
    ).rejects.toMatchObject({ status: 0 })
    await expect(
      connectBackend({ baseUrl: `${BASE}/api`, frontendKey: FRONTEND_KEY }),
    ).rejects.toMatchObject({ status: 0 })
    expect(await apiFetch('/api/student/counsel/cases')).toEqual({ cases: [] })
  })

  it('외부 URL과 상위 경로를 API 호출로 허용하지 않는다', async () => {
    backend()
    await connect()
    for (const path of [
      'https://other.example/api/student/counsel/cases',
      '/api/student/../../health',
      '/api/%2e%2e/health',
    ]) {
      await expect(apiFetch(path)).rejects.toMatchObject({ status: 0 })
    }
  })

  it('가상 시연으로 돌아가면 이전 접속키를 전송하지 않는다', async () => {
    backend()
    await connect()
    await selectMockBackend()
    server.use(
      http.post('http://localhost:5173/api/demo/reset', ({ request }) => {
        expect(request.headers.get('X-Frontend-Access')).toBeNull()
        expect(request.headers.get('X-Teacher-Key')).toBeNull()
        return HttpResponse.json({ reset: true })
      }),
    )
    expect(await apiFetch('/api/demo/reset', { method: 'POST' })).toEqual({ reset: true })
  })

  it('연결을 바꾼 뒤 도착한 이전 서버의 응답을 사용하지 않는다', async () => {
    backend()
    await connect()
    let release: () => void = () => {}
    let accepted: () => void = () => {}
    const started = new Promise<void>((resolve) => {
      accepted = resolve
    })
    server.use(
      http.get(`${BASE}/api/teacher/counsel/cases/slow`, async () => {
        await new Promise<void>((resolve) => {
          release = resolve
          accepted()
        })
        return HttpResponse.json({ old: true })
      }),
    )
    const pending = apiFetch('/api/teacher/counsel/cases/slow')
    await started
    await selectMockBackend()
    release()
    await expect(pending).rejects.toMatchObject({ status: 409 })
  })

  it('취소된 조회는 원래 취소 오류를 유지한다', async () => {
    backend()
    await connect()
    const controller = new AbortController()
    controller.abort()
    await expect(
      apiFetch('/api/student/counsel/cases', { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})
