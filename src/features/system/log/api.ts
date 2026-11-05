import { getApiResult } from '@/lib/http'

export type LogStatus = '成功' | '失败'

export interface LoginLog {
  id: string
  user: string
  ip: string
  location: string
  browser: string
  os: string
  time: string
  status: LogStatus
  /** 结果说明（如「登录成功」「验证码错误」） */
  message?: string
}

export interface OperationLog {
  id: string
  user: string
  /** 日志内容（模块 - 方法 路径） */
  action: string
  ip: string
  /** 耗时（毫秒） */
  cost: number
  time: string
  status: LogStatus
}

/* ---------- 真实后端：/api/v1/logs（单表 sys_log，对齐 jeecg） ---------- */

/** 后端 sys_log 行（jeecg 语义：log_type 0登录/1操作；status 0成功/1失败） */
interface BackendSysLog {
  id: string
  logContent: string
  logType: number
  operateUserName: string
  ip: string
  status: number
  costTime?: number
  browser?: string
  os?: string
  location?: string
  createTime: string
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 登录日志（GET /api/v1/logs/login，取最近 100 条倒序；后端 pageSize 上限 100） */
export async function fetchLoginLogs(): Promise<LoginLog[]> {
  const page = await getApiResult<{ items: BackendSysLog[] }>('/backend-api/v1/logs/login?page=1&pageSize=100')
  return (page.items ?? []).map(row => ({
    id: row.id,
    user: row.operateUserName,
    ip: row.ip,
    location: row.location || '未知',
    browser: row.browser || '未知',
    os: row.os || '未知',
    time: formatDateTime(row.createTime),
    status: row.status === 0 ? '成功' : '失败',
    message: row.logContent
  }))
}

/** 操作日志（GET /api/v1/logs/oper，取最近 100 条倒序；后端 pageSize 上限 100） */
export async function fetchOperationLogs(): Promise<OperationLog[]> {
  const page = await getApiResult<{ items: BackendSysLog[] }>('/backend-api/v1/logs/oper?page=1&pageSize=100')
  return (page.items ?? []).map(row => ({
    id: row.id,
    user: row.operateUserName,
    action: row.logContent,
    ip: row.ip,
    cost: Number(row.costTime ?? 0),
    time: formatDateTime(row.createTime),
    status: row.status === 0 ? '成功' : '失败'
  }))
}

/** 批量删除日志（DELETE /api/v1/logs/login|oper） */
export async function deleteLogs(kind: 'login' | 'oper', ids: string[]): Promise<void> {
  await getApiResult<{ deleted: number }>(`/backend-api/v1/logs/${kind}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  })
}

/** 导出日志 CSV（GET /api/v1/logs/login|oper/export，不分页，上限 5 万行） */
export async function exportLogs(kind: 'login' | 'oper'): Promise<{ filename: string; blob: Blob }> {
  const token = localStorage.getItem('concise-token') ?? ''
  const res = await fetch(`/backend-api/v1/logs/${kind}/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  if (!res.ok) throw new Error(`导出失败: ${res.status}`)
  const disposition = res.headers.get('content-disposition') ?? ''
  const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `${kind}-logs.xlsx`
  return { filename, blob: await res.blob() }
}

/**
 * 操作日志由后端 OperLogInterceptor 对写操作统一记录（sys_log），前端无需上报；
 * 此函数保留为纯透传以兼容既有调用点（包装请求、透传成功/失败）。
 */
export async function withOperationLog<T>(_action: string, fn: () => Promise<T>): Promise<T> {
  return fn()
}
