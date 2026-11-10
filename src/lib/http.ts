import { ApiError, reportRecovered, reportUnavailable } from '@/lib/api-error'
import { beginApiCall, endApiCall } from '@/lib/api-activity'
import { logout } from '@/lib/auth'

/** 普通接口的超时时间：后端挂了时 fetch 可能一直挂着，用户只看到页面转圈没有任何提示 */
const REQUEST_TIMEOUT_MS = 20000

/**
 * 发请求并区分「请求没发出去」和「后端返回了错误」
 *
 * 浏览器在断网/后端进程不在/跨域被拦时，fetch 直接 reject 成
 * `TypeError: Failed to fetch` —— 这句话对用户毫无意义，所以统一转成 ApiError。
 */
async function request(url: string, init?: RequestInit): Promise<Response> {
  const useOwnTimeout = !init?.signal
  const controller = useOwnTimeout ? new AbortController() : null
  const timer = controller
    ? setTimeout(() => controller.abort(new DOMException('请求超时', 'TimeoutError')), REQUEST_TIMEOUT_MS)
    : null

  try {
    // 记账：切换租户时靠「在途请求归零」判断新页面的数据是否已就绪
    beginApiCall()
    return await fetch(url, { ...init, ...(controller ? { signal: controller.signal } : {}) })
  } catch (error) {
    const method = init?.method ?? 'GET'
    if (controller?.signal.aborted) {
      reportUnavailable(`${method} ${url} 超时（${REQUEST_TIMEOUT_MS}ms 未响应）`)
      throw new ApiError('timeout', `${method} ${url} 超时 ${REQUEST_TIMEOUT_MS}ms`)
    }
    const reason = error instanceof Error ? error.message : String(error)
    reportUnavailable(`${method} ${url} 请求未发出：${reason}`)
    throw new ApiError('network', `${method} ${url} → ${reason}`)
  } finally {
    endApiCall()
    if (timer) clearTimeout(timer)
  }
}

/**
 * 安全解析响应体
 *
 * 代理层（vite/Nginx）连不上后端时不会返回 JSON：可能是 502 + text/plain，
 * 也可能是被前端的 SPA 兜底规则返回了一整页 index.html（代理规则没生效时的典型表现）。
 * 这两种情况对用户来说都是「服务用不了」，统一转成 ApiError('unavailable')，
 * 而不是把 HTTP 状态码和接口路径甩到页面上。
 */
export async function parseJsonBody<T>(res: Response, path: string): Promise<T> {
  const text = await res.text()
  const brief = text.trim().slice(0, 160)
  const contentType = res.headers.get('content-type') ?? ''
  const isJson = contentType.includes('json')
  const looksLikeHtml = /^<(!doctype|html)/i.test(brief)

  const gatewayDown = res.status === 502 || res.status === 503 || res.status === 504
  if (gatewayDown || (looksLikeHtml && !isJson)) {
    const detail = [
      `${path} → HTTP ${res.status}`,
      looksLikeHtml ? '响应是 HTML 页面（代理未生效 / 被前端路由兜底）' : '代理无法连接后端',
      brief ? `片段: ${brief.slice(0, 80)}` : ''
    ]
      .filter(Boolean)
      .join('；')
    reportUnavailable(detail)
    throw new ApiError('unavailable', detail, res.status)
  }

  if (!brief) {
    // 空响应体：2xx 说明接口没返回内容（少见但不算错）；其它状态归为服务异常
    if (res.ok) return undefined as T
    throw new ApiError(res.status >= 500 ? 'server' : 'unknown', `${path} → HTTP ${res.status} 空响应体`, res.status)
  }
  if (!isJson) {
    throw new ApiError('unknown', `${path} → HTTP ${res.status} 非 JSON 响应: ${brief.slice(0, 80)}`, res.status)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiError('unknown', `${path} → JSON 解析失败: ${brief.slice(0, 80)}`, res.status)
  }
}

// 轻量 HTTP 封装：统一 JSON 请求、错误处理
// 之后接真实后端时，在这里加 baseURL、鉴权头、错误码处理即可
export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await request(url, { headers: { Accept: 'application/json' }, ...init })
  if (!res.ok) {
    // 先试着解析后端的中文 message；解析不出来时 parseJsonBody 会抛出可读的 ApiError
    const body = await parseJsonBody<{ message?: string | string[] }>(res, url)
    const message = Array.isArray(body?.message) ? body.message.join('；') : body?.message
    throw new ApiError('business', `${url} → HTTP ${res.status} ${message ?? ''}`, res.status, message || undefined)
  }
  reportRecovered()
  return parseJsonBody<T>(res, url)
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
  /** 是否还有下一页（后端 skipCount / limit 截断时下发；total 为 -1 表示未统计） */
  hasNext?: boolean
}

function handleUnauthorized(): never {
  logout()
  if (window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
  throw new ApiError('auth')
}

/**
 * 请求真实后端并解包 result：
 * - /backend-api 由 vite 代理转发到后端 /api
 * - 成功判定：success 优先，缺省时 code === 0（业务失败 HTTP 也是 200）
 * - 携带 token 时自动附加 Authorization 头
 */
export async function getApiResult<T>(url: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('concise-token') ?? ''
  // 当前租户：后端中间件用它做数据隔离（不可信也没关系，服务端会校验归属，越权直接 403）
  const tenantId = localStorage.getItem('concise-tenant') ?? ''
  const isLoginRequest = /\/v1\/auth\/login(?:$|\?)/.test(url)
  const res = await request(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
      ...init?.headers
    }
  })
  // 401 必须在解析响应体之前判：后端 401 的 body code 是 1003/1007（不是 401），
  // 而且响应体可能不是合法 JSON —— 认证失效的可靠载体只有 HTTP 状态码
  if (res.status === 401 && !isLoginRequest) {
    handleUnauthorized()
  }
  const json = await parseJsonBody<ApiEnvelope<T>>(res, url)
  // 兼容分支：个别网关/旧服务用 HTTP 200 + code 401 表达认证失效，也要踢下线
  // （tests/http-unauthorized.test.cjs 锁定了这个约定，别当死代码删掉）
  if (json.code === 401 && !isLoginRequest) {
    handleUnauthorized()
  }
  // 403：登录有效但缺少该接口对应的权限码，给出可操作提示，避免误以为是"没有数据"
  if (res.status === 403) {
    const detail = json.message && json.message !== '禁止访问' ? `${json.message}：` : ''
    throw new ApiError('forbidden', `${url} → 403 ${detail}${json.message ?? ''}`, res.status)
  }
  const ok = json.success ?? json.code === 0
  if (!ok) {
    // 业务失败：后端 message 本身就是给用户看的（如「部门编码已被占用」），直接沿用；
    // code 一并透传，调用方按码分支（如登录页 1009 锁定禁用提交），不要解析 message 文本
    const message = typeof json.message === 'string' ? json.message : ''
    throw new ApiError('business', `${url} → code ${json.code} ${message}`, res.status, message || undefined, json.code)
  }
  reportRecovered()
  // 删除等无返回体接口的 result 为 null，属正常成功，不能当失败处理
  return json.result as T
}
