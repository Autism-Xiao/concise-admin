import { logout } from '@/lib/auth'

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
 * 统一分页结构（后端 Pagination，对齐 jeecg IPage）
 *
 * 后端已经把所有列表接口统一成这个形状：即使是角色/部门/职级这类
 * 数据量小、一次全量返回的接口，也放在 records 里（size = total、pages = 1），
 * 前端只需一套读取方式，不用再逐个确认"这个接口返回的是数组还是分页对象"。
 *
 * 下拉数据源类接口（tree / options / code/:code）仍然返回数组，因为它们不是「列表查询」。
 */
export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages: number
}

function handleUnauthorized(): never {
  logout()
  if (window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
  throw new Error('登录已过期，请重新登录')
}

/**
 * 请求真实后端并解包 result：
 * - /backend-api 由 vite 代理转发到后端 /api
 * - 成功判定：success 优先，缺省时 code === 0（业务失败 HTTP 也是 200）
 * - 携带 token 时自动附加 Authorization 头
 */
export async function getApiResult<T>(url: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('concise-token') ?? ''
  const isLoginRequest = /\/v1\/auth\/login(?:$|\?)/.test(url)
  const res = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers }
  })
  if (res.status === 401 && !isLoginRequest) {
    handleUnauthorized()
  }
  const json = (await res.json()) as ApiEnvelope<T>
  if (json.code === 401 && !isLoginRequest) {
    handleUnauthorized()
  }
  // 403：登录有效但缺少该接口对应的权限码，给出可操作提示，避免误以为是"没有数据"
  if (res.status === 403) {
    const detail = json.message && json.message !== '禁止访问' ? `${json.message}：` : ''
    throw new Error(`${detail}当前角色没有该功能的访问权限，请在「角色权限」中勾选对应菜单/按钮后重新登录`)
  }
  const ok = json.success ?? json.code === 0
  if (!ok) {
    throw new Error(json.message || `请求失败: ${res.status}`)
  }
  // 删除等无返回体接口的 result 为 null，属正常成功，不能当失败处理
  return json.result as T
}
