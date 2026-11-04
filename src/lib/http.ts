// 轻量 HTTP 封装：统一 JSON 请求、错误处理
// 之后接真实后端时，在这里加 baseURL、鉴权头、错误码处理即可
export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, ...init })
  if (!res.ok) {
    throw new Error(`请求失败: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

/** 后端统一响应外壳：{ code, message, result, success, timestamp } */
export interface ApiEnvelope<T> {
  code: number
  message: string
  result: T | null
  success?: boolean
  timestamp?: number
}

/**
 * 请求真实后端并解包 result：
 * - /backend-api 由 vite 代理转发到后端 /api
 * - 成功判定：success 优先，缺省时 code === 0（业务失败 HTTP 也是 200）
 * - 携带 token 时自动附加 Authorization 头
 */
export async function getApiResult<T>(url: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('concise-token') ?? ''
  const res = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers }
  })
  const json = (await res.json()) as ApiEnvelope<T>
  const ok = json.success ?? json.code === 0
  if (!ok || json.result === null) {
    throw new Error(json.message || `请求失败: ${res.status}`)
  }
  return json.result
}
