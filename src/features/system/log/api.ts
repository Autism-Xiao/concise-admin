import { getApiResult, getJson } from '@/lib/http'
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
  /** 失败原因（后端返回的语义化文案，如「验证码错误」） */
  message?: string
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

/* ---------- 登录日志：真实后端 ---------- */

interface BackendLoginLog {
  id: number
  /** 尝试登录的账号（不存在也记录） */
  username: string
  status: number
  message: string
  ip: string
  location?: string
  browser?: string
  os?: string
  userAgent?: string
  createdAt: string
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/**
 * 拉取登录日志（真实后端 GET /api/logs/login）。
 * 后端是分页接口，这里取前 200 条倒序（列表页场景够用）；
 * 字段映射：username→user、0/1→失败/成功、createdAt→time。
 */
export async function fetchLoginLogs(): Promise<LoginLog[]> {
  const page = await getApiResult<{ items: BackendLoginLog[] }>('/backend-api/logs/login?page=1&pageSize=200')
  return (page.items ?? []).map(row => ({
    id: row.id,
    user: row.username,
    ip: row.ip,
    location: row.location || '未知',
    browser: row.browser || '未知',
    os: row.os || '未知',
    time: formatDateTime(row.createdAt),
    status: row.status === 1 ? '成功' : '失败',
    message: row.message
  }))
}

/* ---------- 操作日志：暂为 mock（页面数据仍是本地 mock，后端拦截器只记真实写操作） ---------- */

function formatNow(): string {
  return formatDateTime(new Date().toISOString())
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
      time: formatNow(),
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
