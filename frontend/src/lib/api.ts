const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    super(`API 요청 실패 (${status})`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  /** 객체를 넘기면 JSON으로 직렬화한다. */
  body?: unknown
}

/** 백엔드 API 호출 공통 함수. queryFn·mutationFn 안에서 사용한다. */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  const data: unknown = text ? JSON.parse(text) : null

  if (!response.ok) throw new ApiError(response.status, data)
  return data as T
}
