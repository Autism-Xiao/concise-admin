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
  items: Notice[]
  total: number
  page: number
  pageSize: number
  totalPages: number
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
