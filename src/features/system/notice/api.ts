import { getApiResult } from '@/lib/http'

/** 消息类型（jeecg msg_category）：1 通知公告 / 2 系统消息 */
export type NoticeCategory = '1' | '2'
/** 发布状态（jeecg send_status）：0 未发布 / 1 已发布 / 2 已撤销 */
export type NoticeSendStatus = '0' | '1' | '2'
/** 优先级：L 低 / M 中 / H 高 */
export type NoticePriority = 'L' | 'M' | 'H'
/** 通告对象：ALL 全体用户 / USER 指定用户 */
export type NoticeTarget = 'ALL' | 'USER'

/** 通知公告（对应后端 sys_announcement，字段名已由实体映射成驼峰） */
export interface Notice {
  id: string
  title: string
  msgContent?: string
  msgCategory: NoticeCategory
  msgType?: NoticeTarget
  priority?: NoticePriority
  sendStatus: NoticeSendStatus
  sender?: string
  sendTime?: string
  cancelTime?: string
  startTime?: string
  endTime?: string
  userIds?: string
  createBy?: string
  createTime?: string
  updateBy?: string
  updateTime?: string
}

export interface NoticeListResult {
  records: Notice[]
  total: number
  current: number
  size: number
  pages: number
}

/** 新增/编辑提交体（sendStatus 只传 0/1，撤销走单独接口） */
export interface NoticeWritePayload {
  title: string
  msgContent?: string
  msgCategory?: NoticeCategory
  msgType?: NoticeTarget
  priority?: NoticePriority
  sendStatus?: '0' | '1'
  startTime?: string
  endTime?: string
  userIds?: string
}

export const NOTICE_CATEGORY_LABEL: Record<NoticeCategory, string> = { '1': '通知公告', '2': '系统消息' }
export const NOTICE_STATUS_LABEL: Record<NoticeSendStatus, string> = { '0': '未发布', '1': '已发布', '2': '已撤销' }
export const NOTICE_PRIORITY_LABEL: Record<NoticePriority, string> = { L: '低', M: '中', H: '高' }
export const NOTICE_TARGET_LABEL: Record<NoticeTarget, string> = { ALL: '全体用户', USER: '指定用户' }

/** 时间展示：ISO → YYYY-MM-DD HH:mm */
export function formatDateTime(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export interface NoticeQuery {
  keyword?: string
  msgCategory?: NoticeCategory | ''
  sendStatus?: NoticeSendStatus | ''
  priority?: NoticePriority | ''
  page?: number
  pageSize?: number
}

/** 管理端分页列表（GET /api/v1/notices，含未发布与已撤销） */
export function fetchNotices(query: NoticeQuery = {}): Promise<NoticeListResult> {
  const params = new URLSearchParams({ page: String(query.page ?? 1), pageSize: String(query.pageSize ?? 100) })
  if (query.keyword) params.set('keyword', query.keyword)
  if (query.msgCategory) params.set('msgCategory', query.msgCategory)
  if (query.sendStatus) params.set('sendStatus', query.sendStatus)
  if (query.priority) params.set('priority', query.priority)
  return getApiResult<NoticeListResult>(`/backend-api/v1/notices?${params.toString()}`)
}

export function createNotice(payload: NoticeWritePayload): Promise<Notice> {
  return getApiResult<Notice>('/backend-api/v1/notices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function updateNotice(id: string, payload: Partial<NoticeWritePayload>): Promise<Notice> {
  return getApiResult<Notice>(`/backend-api/v1/notices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function deleteNotice(id: string): Promise<void> {
  return getApiResult<void>(`/backend-api/v1/notices/${id}`, { method: 'DELETE' })
}

/** 发布（未发布/已撤销 → 已发布） */
export function publishNotice(id: string): Promise<Notice> {
  return getApiResult<Notice>(`/backend-api/v1/notices/${id}/publish`, { method: 'PUT' })
}

/** 撤销（已发布 → 已撤销） */
export function revokeNotice(id: string): Promise<Notice> {
  return getApiResult<Notice>(`/backend-api/v1/notices/${id}/revoke`, { method: 'PUT' })
}

/* ---------- 导入（/api/v1/notices/import | import-template） ---------- */

/** 导入结果：后端逐行统计 + 失败明细（row 为 Excel 真实行号） */
export interface NoticeImportResult {
  total: number
  created: number
  updated: number
  skipped: number
  failed: number
  errors: Array<{ row: number; title: string; message: string }>
}

/** 文件下载走原生 fetch：需要 blob 与 Content-Disposition 里的中文文件名，不走 JSON 外壳 */
async function downloadFile(path: string, fallbackName: string): Promise<{ filename: string; blob: Blob }> {
  const token = localStorage.getItem('concise-token') ?? ''
  const res = await fetch(`/backend-api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  if (!res.ok) throw new Error(`下载失败: ${res.status}`)
  const disposition = res.headers.get('content-disposition') ?? ''
  const utf8Name = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1]
  const filename = utf8Name ? decodeURIComponent(utf8Name) : (/filename="?([^";]+)"?/.exec(disposition)?.[1] ?? fallbackName)
  return { filename, blob: await res.blob() }
}

/** 下载公告导入模板（首表为说明+表头，次表为填写示例） */
export function downloadNoticeTemplate(): Promise<{ filename: string; blob: Blob }> {
  return downloadFile('/v1/notices/import-template', 'notices-import-template.xlsx')
}

/** 导入公告（multipart，字段名 file；支持 .xlsx/.csv，标题已存在则更新） */
export function importNotices(file: File): Promise<NoticeImportResult> {
  const form = new FormData()
  form.append('file', file)
  return getApiResult<NoticeImportResult>('/backend-api/v1/notices/import', { method: 'POST', body: form })
}
