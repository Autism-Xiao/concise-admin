/**
 * 面向用户的接口错误模型
 *
 * 设计原则（这是本文件存在的唯一理由）：
 * - `message` 只放**用户能看懂的人话**：不出现 HTTP 状态码、接口路径、端口号、
 *   `BACKEND_URL` / `vite 代理` 这类只有开发者才懂的词。终端用户看到这些除了困惑没有任何用处。
 * - 技术细节放 `detail`，只写进浏览器控制台（`console.error`）。开发环境会把它附在
 *   message 末尾方便当场排查，生产环境绝不外泄。
 * - `kind` 让调用方能分支处理（比如「服务不可用」才弹全局横幅，业务校验失败不要弹）。
 *
 * 之前的做法是把诊断信息直接拼进 message，结果页面上弹出
 * 「没有收到后端响应（HTTP 502）：/backend-api/v1/tenants。请确认后端服务已启动，
 * 且 vite 代理 BACKEND_URL 指向正确端口」—— 一线用户完全无从下手。
 */
export type ApiErrorKind =
  /** 请求根本没发出去 / 断网 / 跨域被拦 */
  | 'network'
  /** 网关连不上后端：502/503/504，或代理没配对返回了 HTML */
  | 'unavailable'
  /** 超时 */
  | 'timeout'
  /** 后端 5xx */
  | 'server'
  /** 未登录 / 登录过期 */
  | 'auth'
  /** 登录有效但没权限 */
  | 'forbidden'
  /** 业务校验失败（后端给了中文文案，直接用） */
  | 'business'
  | 'unknown'

/** 兜底文案：按错误类型给「一句人话 + 一句该怎么办」，不带任何技术术语 */
const KIND_MESSAGE: Record<ApiErrorKind, string> = {
  network: '网络好像断了，请检查网络后重试',
  unavailable: '服务暂时连不上，请稍后重试',
  timeout: '请求超时了，请稍后重试',
  server: '服务器处理出错了，请稍后重试',
  auth: '登录已过期，请重新登录',
  forbidden: '当前账号没有这个功能的权限，请联系管理员开通',
  business: '操作没成功，请重试',
  unknown: '操作没成功，请重试'
}

/** 这几类说明「服务不可用」，需要提示全局横幅，不是用户操作错了 */
const UNAVAILABLE_KINDS: ApiErrorKind[] = ['network', 'unavailable', 'timeout']

/** 服务恢复可用（任意请求成功）时广播，横幅据此自动消失 */
export const API_RECOVERED_EVENT = 'concise:api-recovered'
/** 服务不可用（连不上/超时）时广播，全局横幅据此出现 */
export const API_UNAVAILABLE_EVENT = 'concise:api-unavailable'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number
  /** 技术细节（接口路径、状态码、代理目标、原始响应片段），只给开发者和控制台看 */
  readonly detail?: string
  /** 值得原样重试（网络类），UI 可以据此显示「重试」按钮 */
  readonly retryable: boolean

  /**
   * @param userMessage 后端已经给了中文文案时（业务校验失败）直接用它，
   *   不要用兜底话术覆盖 —— 「部门编码已被占用」比「操作没成功，请重试」有用得多
   */
  constructor(kind: ApiErrorKind, detail?: string, status?: number, userMessage?: string) {
    // 开发环境把细节附在文案后面，方便本机联调时一眼看到是哪一步断的；
    // 生产构建里 detail 只进控制台，用户只看人话。
    const base = userMessage || KIND_MESSAGE[kind] || KIND_MESSAGE.unknown
    super(import.meta.env.DEV && detail && !userMessage ? `${base}（${detail}）` : base)
    this.name = 'ApiError'
    this.kind = kind
    this.detail = detail
    this.status = status
    this.retryable = UNAVAILABLE_KINDS.includes(kind)
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** 判断是否属于「服务不可用」——调用方据此决定要不要弹全局横幅而不是行内报错 */
export function isUnavailableError(error: unknown): boolean {
  return isApiError(error) && error.retryable
}

/** 把任意异常转成给用户看的一句话（非 ApiError 的也兜住，避免冒出 "Failed to fetch"） */
export function userMessageOf(error: unknown, fallback = '操作没成功，请重试'): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error && error.message) {
    // 原生 fetch 的网络错误在浏览器里就是这几句英文，全部换成人话
    if (/failed to fetch|networkerror|load failed|fetch failed/i.test(error.message)) {
      return KIND_MESSAGE.network
    }
    if (/aborted|timeout/i.test(error.message)) return KIND_MESSAGE.timeout
    return error.message
  }
  return fallback
}

/**
 * 当前是否处于「服务不可用」状态
 *
 * 只在状态翻转时广播事件：页面并发几十个请求同时失败时不会刷几十次事件，
 * 恢复后也不再每个成功请求都 dispatch 一遍（成功请求是常态）。
 */
let unavailable = false

export function isServiceUnavailable(): boolean {
  return unavailable
}

/**
 * 记录诊断信息并广播「服务不可用」
 *
 * 控制台这条是给运维/开发者看的完整证据链：哪个接口、什么状态、代理目标是谁。
 * 页面上的横幅只负责告诉用户「现在用不了 + 该怎么办」。
 */
export function reportUnavailable(detail: string): void {
  if (unavailable) {
    // 已经提示过了，后续失败只留调试日志，避免控制台和页面被刷屏
    console.debug('[接口仍不可用]', detail)
    return
  }
  unavailable = true
  console.error('[接口不可用]', detail)
  window.dispatchEvent(new CustomEvent(API_UNAVAILABLE_EVENT, { detail }))
}

/** 任意请求成功即视为服务已恢复，让横幅消失（幂等，无副作用） */
export function reportRecovered(): void {
  if (!unavailable) return
  unavailable = false
  window.dispatchEvent(new Event(API_RECOVERED_EVENT))
}
