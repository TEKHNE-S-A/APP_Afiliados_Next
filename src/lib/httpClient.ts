/**
 * Cliente HTTP centralizado para llamar al backend Express existente.
 * Los API routes de Next.js usan este cliente cuando delegan al backend.
 */

const BASE_URL = process.env.BACKEND_URL ?? 'http://localhost:3000'
const DEFAULT_TIMEOUT_MS = 15_000

interface FetchOptions extends RequestInit {
  token?: string
  timeout?: number
}

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, timeout = DEFAULT_TIMEOUT_MS, headers: extraHeaders, ...rest } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers,
      signal: controller.signal,
    })

    if (!res.ok) {
      let body: unknown
      try {
        body = await res.json()
      } catch {
        body = null
      }
      throw new HttpError(res.status, `Backend error ${res.status} on ${path}`, body)
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      return res.json() as Promise<T>
    }
    return res.text() as unknown as T
  } finally {
    clearTimeout(timer)
  }
}

export const httpClient = {
  get: <T>(path: string, options?: FetchOptions) => request<T>(path, { method: 'GET', ...options }),
  post: <T>(path: string, body: unknown, options?: FetchOptions) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: <T>(path: string, body: unknown, options?: FetchOptions) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body), ...options }),
  patch: <T>(path: string, body: unknown, options?: FetchOptions) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body), ...options }),
  delete: <T>(path: string, options?: FetchOptions) =>
    request<T>(path, { method: 'DELETE', ...options }),
}

export { HttpError }
