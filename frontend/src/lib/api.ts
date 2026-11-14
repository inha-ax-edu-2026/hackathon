const ENV_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')
const STORAGE_KEY = 'safepath.backend.connection'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    const detail = (body as { detail?: unknown } | null)?.detail
    super(typeof detail === 'string' ? detail : `API 요청 실패 (${status})`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  /** 객체를 넘기면 JSON으로 직렬화한다. */
  body?: unknown
}

type Credentials = { frontendKey: string; teacherKey: string }
export type BackendConnection = {
  mode: 'mock' | 'backend'
  baseUrl: string
  ready: boolean
  aiMode?: string
  model?: string
  revision?: number
}
export type ConnectBackendInput = {
  baseUrl: string
  frontendKey: string
  teacherKey?: string
}
type Health = {
  status: string
  integration_contract: string
  frontend_demo_enabled: boolean
  frontend_ai_mode: string
  quality_model: string
}

function normalizeBaseUrl(value: string) {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    throw new ApiError(0, { detail: '올바른 백엔드 HTTPS 주소를 입력해 주세요.' })
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (
    (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new ApiError(0, {
      detail: '서버 주소만 입력해 주세요. /api·경로·접속키를 주소에 넣지 마세요.',
    })
  }
  return url.origin
}

function initialConnection(): BackendConnection {
  const mock =
    import.meta.env.VITE_USE_MOCK === 'true' ||
    (import.meta.env.VITE_USE_MOCK !== 'false' && !ENV_BASE_URL)
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null')
    if (stored?.mode === 'backend') {
      return { mode: 'backend', baseUrl: normalizeBaseUrl(stored.baseUrl), ready: false }
    }
    if (stored?.mode === 'mock') return { mode: 'mock', baseUrl: ENV_BASE_URL, ready: true }
  } catch {
    // 저장소가 차단되어도 환경변수로 시작한다. 접속키는 저장소에서 읽지 않는다.
  }
  return { mode: mock ? 'mock' : 'backend', baseUrl: ENV_BASE_URL, ready: mock }
}

let connection = initialConnection()
let credentials: Credentials = { frontendKey: '', teacherKey: '' }
let revision = 0
let switching = false
let mockController: (enabled: boolean) => Promise<void> = async () => {}
let resetConnectionCache: () => void = () => {}
const listeners = new Set<() => void>()

/** 브라우저는 MSW 시작/종료를 주입하고 테스트는 기존 msw/node를 사용한다. */
export function registerMockController(controller: typeof mockController) {
  mockController = controller
}

/** 새 연결을 공개하기 전에 이전 서버의 캐시를 비운다. */
export function registerConnectionReset(reset: () => void) {
  resetConnectionCache = reset
}

export function getBackendConnection() {
  return connection
}

export function subscribeBackendConnection(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function publish(next: BackendConnection, keys: Credentials) {
  resetConnectionCache()
  revision += 1
  connection = { ...next, revision }
  credentials = keys
  try {
    // 주소와 모드만 기억한다. 키는 현재 탭 메모리에만 둔다.
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: next.mode, baseUrl: next.baseUrl }))
  } catch {
    /* 저장소 없이도 현재 연결을 유지한다. */
  }
  for (const listener of listeners) listener()
}

function authHeaders(path: string, keys: Credentials) {
  const headers = new Headers()
  if (
    path.startsWith('/api/student/counsel/') ||
    path.startsWith('/api/teacher/counsel/') ||
    path === '/api/demo/reset'
  ) {
    if (keys.frontendKey) headers.set('X-Frontend-Access', keys.frontendKey)
  } else if (path.startsWith('/api/teacher/') && keys.teacherKey) {
    headers.set('X-Teacher-Key', keys.teacherKey)
  }
  return headers
}

async function requestJson<T>(
  baseUrl: string,
  path: string,
  options: ApiFetchOptions,
  keys: Credentials,
): Promise<T> {
  const parsed = new URL(path, 'https://api.invalid')
  if (
    ((!path.startsWith('/api/') || !parsed.pathname.startsWith('/api/')) && path !== '/health') ||
    path.includes('\\') ||
    parsed.hash ||
    parsed.origin !== 'https://api.invalid' ||
    parsed.pathname !== path.split('?')[0]
  ) {
    throw new ApiError(0, { detail: '허용되지 않은 API 경로입니다.' })
  }
  const { body, headers: suppliedHeaders, ...rest } = options
  const headers = new Headers(suppliedHeaders)
  headers.set('Accept', 'application/json')
  if (body !== undefined) headers.set('Content-Type', 'application/json')
  headers.delete('X-Frontend-Access')
  headers.delete('X-Teacher-Key')
  authHeaders(path, keys).forEach((value, name) => {
    headers.set(name, value)
  })
  const signal = options.signal ?? AbortSignal.timeout(path === '/health' ? 10000 : 90000)
  let response: Response
  let text: string
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...rest,
      signal,
      headers,
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    text = await response.text()
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new ApiError(0, {
      detail: signal.aborted
        ? '백엔드 응답 시간이 초과됐어요. 다시 확인해 주세요.'
        : '백엔드에 연결하지 못했어요. 서버 실행·HTTPS 주소·허용 출처를 확인해 주세요.',
    })
  }
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new ApiError(response.ok ? 502 : response.status, {
      detail: 'API가 JSON 대신 다른 내용을 반환했어요. 백엔드 주소를 확인해 주세요.',
    })
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new ApiError(response.status, {
        detail:
          '접속키 또는 허용된 프론트 주소를 확인해 주세요. 연결 설정에서 다시 입력할 수 있어요.',
      })
    }
    throw new ApiError(response.status, data)
  }
  return data as T
}

/** 상태·연동키만 확인한다. 유료 추론과 데이터 쓰기는 하지 않는다. */
export async function connectBackend(input: ConnectBackendInput) {
  if (switching) throw new ApiError(409, { detail: '서버 연결을 확인 중입니다.' })
  const baseUrl = normalizeBaseUrl(input.baseUrl)
  const sameServer = connection.mode === 'backend' && connection.baseUrl === baseUrl
  const keys = {
    frontendKey: input.frontendKey.trim() || (sameServer ? credentials.frontendKey : ''),
    teacherKey: input.teacherKey?.trim() || (sameServer ? credentials.teacherKey : ''),
  }
  if (!keys.frontendKey) throw new ApiError(0, { detail: '프론트 연동키를 입력해 주세요.' })
  if (
    !/^[!-~]{24,4096}$/.test(keys.frontendKey) ||
    (keys.teacherKey && !/^[!-~]{16,4096}$/.test(keys.teacherKey))
  ) {
    throw new ApiError(0, {
      detail: '접속키 형식을 확인해 주세요. 따옴표와 줄바꿈 없이 값만 입력합니다.',
    })
  }
  const previousMode = connection.mode
  switching = true
  try {
    await mockController(false)
    const health = await requestJson<Health>(baseUrl, '/health', {}, keys)
    if (
      health?.status !== 'ok' ||
      health.integration_contract !== 'document-demo-v1' ||
      !health.frontend_demo_enabled
    ) {
      throw new ApiError(503, {
        detail: '프론트 상담 API가 켜진 최신 SAFE-PATH 백엔드인지 확인해 주세요.',
      })
    }
    const list = await requestJson<{ cases: unknown[] }>(
      baseUrl,
      '/api/student/counsel/cases',
      {},
      keys,
    )
    if (!Array.isArray(list?.cases))
      throw new ApiError(502, { detail: '상담 목록 응답 형식이 맞지 않아요.' })
    if (keys.teacherKey) await requestJson(baseUrl, '/api/teacher/reports', {}, keys)
    publish(
      {
        mode: 'backend',
        baseUrl,
        ready: true,
        aiMode: health.frontend_ai_mode,
        model: health.quality_model,
      },
      keys,
    )
    return health
  } catch (error) {
    await mockController(previousMode === 'mock')
    throw error
  } finally {
    switching = false
  }
}

export async function selectMockBackend() {
  if (switching) throw new ApiError(409, { detail: '서버 연결을 확인 중입니다.' })
  await mockController(true)
  publish({ mode: 'mock', baseUrl: ENV_BASE_URL, ready: true }, { frontendKey: '', teacherKey: '' })
}

export function requireBackendConnection() {
  publish(
    { mode: 'backend', baseUrl: ENV_BASE_URL, ready: false },
    { frontendKey: '', teacherKey: '' },
  )
}

/** queryFn·mutationFn에서 사용하는 공통 API 호출. */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  if (switching) throw new ApiError(409, { detail: '서버 연결을 확인 중입니다.' })
  if (!connection.ready)
    throw new ApiError(401, {
      detail: '연결 설정에서 백엔드 주소와 프론트 연동키를 입력해 주세요.',
    })
  const started = revision
  const data = await requestJson<T>(connection.baseUrl, path, options, credentials)
  if (started !== revision)
    throw new ApiError(409, { detail: '서버 연결이 변경되어 이전 응답을 사용하지 않았어요.' })
  return data
}
