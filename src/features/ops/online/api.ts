import { getApiResult } from '@/lib/http'

/** 一条在线会话（来自后端 Redis 会话，非表数据） */
export interface OnlineUser {
  /** 会话编号 = accessToken 哈希，用于强制下线 */
  sessionId: string
  userId: string
  username: string
  dept: string
  ip: string
  location: string
  browser: string
  os: string
  loginTime: string
  lastActive: string
  /** 令牌过期时间（到点会话自动消失） */
  expiresAt: string
}

export interface OnlinePage {
  items: OnlineUser[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const BASE = '/backend-api/v1/online'

/** 在线用户列表（后端分页，这里取前 100 条，表格内再分页） */
export function fetchOnlineUsers(keyword?: string): Promise<OnlinePage> {
  const search = new URLSearchParams({ page: '1', pageSize: '100' })
  if (keyword) search.set('keyword', keyword)
  return getApiResult<OnlinePage>(`${BASE}?${search.toString()}`)
}

/** 在线人数 */
export function countOnlineUsers(): Promise<number> {
  return getApiResult<number>(`${BASE}/count`)
}

/** 强制下线（该令牌立即失效，用户后续请求 401） */
export function kickUser(sessionId: string): Promise<{ kicked: number }> {
  return getApiResult<{ kicked: number }>(`${BASE}/${sessionId}`, { method: 'DELETE' })
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
