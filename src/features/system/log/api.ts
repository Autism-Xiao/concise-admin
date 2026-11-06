import type { ImportResult } from '@/components/excel-import-dialog'
import { downloadFromApi } from '@/lib/download'
import { getApiResult } from '@/lib/http'

export type LogStatus = '成功' | '失败'

/** 日志类型：login 登录日志 / oper 操作日志（对应后端 /v1/logs/{login|oper}） */
export type LogKind = 'login' | 'oper'

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

/** 登录日志（GET /api/v1/logs/login，取最近 100 条倒序；后端 pageSize 上限 100）；userId 用于用户管理页按人过滤 */
export async function fetchLoginLogs(userId?: string): Promise<LoginLog[]> {
  const qs = userId ? `&userId=${encodeURIComponent(userId)}` : ''
  const page = await getApiResult<{ records: BackendSysLog[] }>(`/backend-api/v1/logs/login?page=1&pageSize=100${qs}`)
  return (page.records ?? []).map(row => ({
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
  const page = await getApiResult<{ records: BackendSysLog[] }>('/backend-api/v1/logs/oper?page=1&pageSize=100')
  return (page.records ?? []).map(row => ({
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
export async function deleteLogs(kind: LogKind, ids: string[]): Promise<void> {
  await getApiResult<{ deleted: number }>(`/backend-api/v1/logs/${kind}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  })
}

export interface LogExportParams {
  /** 用户名模糊过滤（后端字段名 username） */
  keyword?: string
  /** 结果过滤：成功=0 / 失败=1，仅登录日志支持（操作日志 DTO 没有该字段） */
  status?: LogStatus
}

/**
 * 导出日志 Excel（GET /api/v1/logs/login|oper/export，与列表同过滤条件，不分页）
 *
 * 走公共 downloadFromApi 拿 blob + Content-Disposition 文件名，与用户/公告导出同一套写法。
 */
export function exportLogs(kind: LogKind, params: LogExportParams = {}): Promise<{ filename: string; blob: Blob }> {
  const qs = new URLSearchParams()
  if (params.keyword) qs.set('username', params.keyword)
  // 操作日志的查询 DTO 没有 status 字段，传了会被白名单剥掉，不如不传
  if (params.status && kind === 'login') qs.set('status', params.status === '成功' ? '0' : '1')
  const query = qs.toString()
  return downloadFromApi(`/v1/logs/${kind}/export${query ? `?${query}` : ''}`, `${kind}-logs.xlsx`)
}

/** 下载日志导入模板 Excel（首个工作表为说明 + 表头，第二个为填写示例） */
export function downloadLogTemplate(kind: LogKind): Promise<{ filename: string; blob: Blob }> {
  return downloadFromApi(`/v1/logs/${kind}/import-template`, `${kind}-logs-import-template.xlsx`)
}

/**
 * 导入日志（POST /api/v1/logs/login|oper/import，multipart 字段名 file）
 *
 * 只新增不覆盖，单行失败不影响其他行；返回结构与用户/字典导入一致，可直接喂给 ExcelImportDialog。
 */
export function importLogs(kind: LogKind, file: File): Promise<ImportResult> {
  const form = new FormData()
  form.append('file', file)
  return getApiResult<ImportResult>(`/backend-api/v1/logs/${kind}/import`, { method: 'POST', body: form })
}

/**
 * 操作日志由后端 OperLogInterceptor 对写操作统一记录（sys_log），前端无需上报；
 * 此函数保留为纯透传以兼容既有调用点（包装请求、透传成功/失败）。
 */
export async function withOperationLog<T>(_action: string, fn: () => Promise<T>): Promise<T> {
  return fn()
}
