import { getApiResult } from '@/lib/http'

/** 口径：all=全站（有权限）/ self=只看自己（服务端已降级） */
export type BlockScope = 'all' | 'self'

export interface DashboardProfile {
  id: string
  username: string
  realname: string
  avatar: string | null
  deptNames: string[]
  roleNames: string[]
  lastLogin: { time: string; ip: string; browser: string; location: string } | null
}

export interface UserTotalBlock {
  scope: BlockScope
  total: number
  active: number
  frozen: number
}

export interface TodayLoginBlock {
  scope: BlockScope
  success: number
  fail: number
}

export interface LoginTrendPoint {
  date: string
  success: number
  fail: number
}

export interface LoginTrendBlock {
  scope: BlockScope
  points: LoginTrendPoint[]
}

export interface OperLogRow {
  id: string
  operator: string
  content: string
  type: number
  status: number
  costTime: number
  ip: string
  time: string
}

export interface RecentOpersBlock {
  scope: BlockScope
  rows: OperLogRow[]
}

export interface StorageBlock {
  usedBytes: number
  quotaBytes: number
  fileCount: number
}

export interface TaskBlock {
  scope: BlockScope
  pending: number
  doing: number
  done: number
  cancelled: number
}

export interface NoticeRow {
  id: string
  title: string
  priority: string
  category: string
  sendTime: string | null
}

export interface ServerStateBlock {
  cpuUsage: number
  memoryUsage: number
  memoryUsedMb: number
  memoryTotalMb: number
  diskUsage: number
  nodeVersion: string
  uptime: string
}

/**
 * 首页聚合数据
 *
 * 所有「可能没权限」的块都是 `| null`：**null 表示没权限，不是没数据**。
 * 渲染时判 null 直接不画，不要去 `?? 0` 兜底，否则会显示一个误导性的 0。
 */
export interface DashboardOverview {
  profile: DashboardProfile
  userTotal: UserTotalBlock | null
  todayLogin: TodayLoginBlock | null
  onlineCount: number | null
  roleTotal: number | null
  loginTrend: LoginTrendBlock | null
  recentOpers: RecentOpersBlock | null
  myStorage: StorageBlock
  myTasks: TaskBlock
  notices: NoticeRow[]
  serverState: ServerStateBlock | null
}

/** 首页数据全部来自后端聚合接口（权限裁剪在服务端完成，前端不参与判定） */
export function fetchOverview(): Promise<DashboardOverview> {
  return getApiResult<DashboardOverview>('/backend-api/v1/dashboard/overview')
}

/* ------------------------------- 展示格式化 ------------------------------- */

/** 字节 → 人类可读（1024 进制，保留 1 位小数；0 显示 0 B） */
export function formatBytes(bytes: number | null | undefined): string {
  const value = Number(bytes ?? 0)
  if (!Number.isFinite(value) || value <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = value
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }
  return `${unit === 0 ? size : size.toFixed(1)} ${units[unit]}`
}

/** ISO 时间 → 相对时间（首页只关心"多久以前"） */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const target = new Date(iso).getTime()
  if (Number.isNaN(target)) return '—'
  const diff = Date.now() - target
  if (diff < 60_000) return '刚刚'
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return formatDateTime(iso)
}

/** ISO 时间 → 2026-11-07 11:58 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 按小时给问候语（0-5 凌晨 / 6-11 上午 / 12-17 下午 / 18-23 晚上） */
export function greeting(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 6) return '凌晨好'
  if (hour < 12) return '上午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}
