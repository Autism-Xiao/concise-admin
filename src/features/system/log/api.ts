import type { ImportResult } from '@/components/excel-import-dialog'
import { downloadFromApi } from '@/lib/download'
import { getApiResult, type PageResult } from '@/lib/http'

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
  /** 平台管理员代维标记：1 = 该操作由平台管理员切在租户里（或平台视角）做出 */
  proxy?: boolean
}

/* ---------- 真实后端：/api/v1/logs（单表 sys_log） ---------- */

/** 后端 sys_log 行（log_type 0登录/1操作；status 0成功/1失败） */
interface BackendSysLog {
  id: string
  logContent: string
  logType: number
  operateUserName: string
  ip: string
  status: number
  costTime?: number
  isProxy?: number
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

/** 日志列表查询参数（服务端分页 + 搜索 + 状态 + 排序） */
export interface LogQuery {
  page?: number
  pageSize?: number
  /** 用户名模糊匹配（后端参数名 username） */
  keyword?: string
  status?: LogStatus
  /** 精确按用户过滤（用户管理页的登录日志弹窗用） */
  userId?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

function buildLogQuery(query: LogQuery): string {
  const qs = new URLSearchParams({ page: String(query.page ?? 1), pageSize: String(query.pageSize ?? 10) })
  if (query.userId) qs.set('userId', query.userId)
  if (query.keyword?.trim()) qs.set('username', query.keyword.trim())
  if (query.status) qs.set('status', query.status === '成功' ? '0' : '1')
  if (query.sortBy) {
    qs.set('sortBy', query.sortBy)
    qs.set('sortOrder', query.sortOrder ?? 'asc')
  }
  return qs.toString()
}

/** 登录日志（GET /api/v1/logs/login，服务端分页/搜索/排序）；userId 用于用户管理页按人过滤 */
export async function fetchLoginLogs(query: LogQuery = {}): Promise<PageResult<LoginLog>> {
  const page = await getApiResult<PageResult<BackendSysLog>>(`/backend-api/v1/logs/login?${buildLogQuery(query)}`)
  return {
    ...page,
    records: (page.records ?? []).map(row => ({
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
}

/** 操作日志（GET /api/v1/logs/oper，服务端分页/搜索/排序） */
export async function fetchOperationLogs(query: LogQuery = {}): Promise<PageResult<OperationLog>> {
  const page = await getApiResult<PageResult<BackendSysLog>>(`/backend-api/v1/logs/oper?${buildLogQuery(query)}`)
  return {
    ...page,
    records: (page.records ?? []).map(row => ({
      id: row.id,
      user: row.operateUserName,
      action: row.logContent,
      ip: row.ip,
      cost: Number(row.costTime ?? 0),
      time: formatDateTime(row.createTime),
      status: row.status === 0 ? '成功' : '失败',
      proxy: row.isProxy === 1
    }))
  }
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

/* ---------- 字段级变更审计：/api/v1/logs/changes（sys_log_change） ---------- */

/** 后端一行变更：谁、在什么时间、把哪张表的哪条记录的哪个字段从 A 改成 B */
interface BackendChangeLog {
  id: string
  tableName: string
  recordId: string
  field: string
  fieldLabel: string | null
  oldValue: string
  newValue: string
  operateUserName: string | null
  createTime: string
}

export interface ChangeLog {
  id: string
  /** 物理表名，如 sys_depart */
  tableName: string
  recordId: string
  /** 属性名，如 description */
  field: string
  /** 列注释里的中文名；老表没写 comment 时为空，前端回落显示 field */
  fieldLabel: string | null
  oldValue: string
  newValue: string
  operateUserName: string | null
  time: string
}

export interface ChangeLogQuery {
  tableName?: string
  recordId?: string
  field?: string
  /** YYYY-MM-DD（日期选择框给的值），请求时补到当天 00:00:00 */
  startTime?: string
  /** YYYY-MM-DD，请求时补到当天 23:59:59 —— 不补的话「结束日期=今天」会漏掉今天的所有记录 */
  endTime?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * 变更日志列表（GET /api/v1/logs/changes）
 *
 * 这张表是「数据本身变了什么」，量随业务写入增长，所以走服务端分页，
 * 不再一次拉 100 条到浏览器里本地翻页。
 */
export async function fetchChangeLogs(query: ChangeLogQuery = {}): Promise<PageResult<ChangeLog>> {
  const qs = new URLSearchParams({ page: String(query.page ?? 1), pageSize: String(query.pageSize ?? 20) })
  if (query.tableName) qs.set('tableName', query.tableName)
  if (query.recordId) qs.set('recordId', query.recordId)
  if (query.field) qs.set('field', query.field)
  if (query.startTime) qs.set('startTime', `${query.startTime}T00:00:00`)
  if (query.endTime) qs.set('endTime', `${query.endTime}T23:59:59`)
  if (query.sortBy) {
    qs.set('sortBy', query.sortBy)
    qs.set('sortOrder', query.sortOrder ?? 'asc')
  }
  const page = await getApiResult<PageResult<BackendChangeLog>>(`/backend-api/v1/logs/changes?${qs.toString()}`)
  return {
    ...page,
    records: (page.records ?? []).map(row => ({
      id: row.id,
      tableName: row.tableName,
      recordId: row.recordId,
      field: row.field,
      fieldLabel: row.fieldLabel,
      oldValue: row.oldValue,
      newValue: row.newValue,
      operateUserName: row.operateUserName,
      time: formatDateTime(row.createTime)
    }))
  }
}
