import { getJson } from '@/lib/http'
import { getUsername } from '@/lib/auth'
import { fetchPublicIp } from '@/lib/use-public-ip'

export type LogStatus = '成功' | '失败'

export interface LoginLog {
  id: number
  user: string
  ip: string
  location: string
  browser: string
  os: string
  time: string
  status: LogStatus
}

export interface OperationLog {
  id: number
  user: string
  action: string
  ip: string
  /** 耗时（毫秒） */
  cost: number
  time: string
  status: LogStatus
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchLoginLogs(): Promise<LoginLog[]> {
  return getJson<LoginLog[]>('/mock/logs-login.json')
}

function parseBrowser(ua: string): string {
  const m = ua.match(/(Edg|Firefox|Chrome|Safari)\/(\d+)/)
  if (!m) return '未知浏览器'
  const name = m[1] === 'Edg' ? 'Edge' : m[1]
  return `${name} ${m[2]}`
}

function parseOs(ua: string): string {
  if (ua.includes('Windows NT 10')) return 'Windows 10/11'
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac OS X')) return 'macOS'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  if (ua.includes('Linux')) return 'Linux'
  return '未知系统'
}

function formatTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/**
 * 追加一条登录日志（成功/失败都记）。开发环境写入 logs-login.json；
 * 生产环境换成真实日志接口。调用方 fire-and-forget，失败静默忽略。
 */
export async function reportLogin(user: string, status: LogStatus): Promise<void> {
  const ip = await fetchPublicIp()
  await fetch('/api/logs/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user,
      ip,
      location: ip === '127.0.0.1' ? '本机' : '未知',
      browser: parseBrowser(navigator.userAgent),
      os: parseOs(navigator.userAgent),
      time: formatTime(new Date()),
      status
    })
  })
}

/**
 * 追加一条操作日志。开发环境写入 logs-operation.json；
 * 生产环境换成真实日志接口。调用方 fire-and-forget，失败静默忽略。
 */
export async function reportOperation(action: string, cost: number, status: LogStatus): Promise<void> {
  const ip = await fetchPublicIp()
  await fetch('/api/logs/operation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: getUsername(),
      action,
      ip,
      cost,
      time: formatTime(new Date()),
      status
    })
  })
}

/**
 * 包装一个增删改操作：自动计时并按结果写操作日志（成功/失败），
 * 日志写入失败不影响操作本身，操作失败会照常抛出交给调用方回退。
 */
export async function withOperationLog<T>(action: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now()
  try {
    const result = await fn()
    reportOperation(action, Math.round(performance.now() - start), '成功').catch(() => {
      // 日志写入失败不影响操作
    })
    return result
  } catch (e) {
    reportOperation(action, Math.round(performance.now() - start), '失败').catch(() => {
      // 日志写入失败不影响操作
    })
    throw e
  }
}
export function fetchOperationLogs(): Promise<OperationLog[]> {
  return getJson<OperationLog[]>('/mock/logs-operation.json')
}
