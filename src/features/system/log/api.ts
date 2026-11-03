import { getJson } from '@/lib/http'
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
export function fetchOperationLogs(): Promise<OperationLog[]> {
  return getJson<OperationLog[]>('/mock/logs-operation.json')
}
