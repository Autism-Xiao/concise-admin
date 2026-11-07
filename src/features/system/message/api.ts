import { getApiResult } from '@/lib/http'

/** 发送记录（管理端，对应 sys_message） */
export interface MessageRecord {
  id: string
  title: string
  content: string
  msgType: 'send' | 'system'
  senderId: string | null
  receiverCount: number
  createdAt: string
}

export interface MessageListResult {
  records: MessageRecord[]
  total: number
  current: number
  size: number
  pages: number
}

/** 我的消息（对应 sys_message_user ⋈ sys_message 投影） */
export interface MyMessageRow {
  id: string
  title: string
  content: string
  msgType: string
  senderId: string | null
  isRead: number
  readAt: string | null
  createdAt: string
}

export interface MyMessageListResult {
  records: MyMessageRow[]
  total: number
  current: number
  size: number
  pages: number
}

export function fetchMessages(params: { page?: number; pageSize?: number; keyword?: string }) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') qs.set(key, String(value))
  })
  return getApiResult<MessageListResult>(`/backend-api/v1/messages?${qs.toString()}`)
}

export function sendMessage(payload: { title: string; content: string; userIds: string[] }) {
  return getApiResult<{ id: string; delivered: number }>('/backend-api/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function deleteMessage(id: string) {
  return getApiResult<unknown>(`/backend-api/v1/messages/${id}`, { method: 'DELETE' })
}

export function fetchMyMessages(params: { page?: number; pageSize?: number; unread?: number }) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) qs.set(key, String(value))
  })
  return getApiResult<MyMessageListResult>(`/backend-api/v1/messages/mine?${qs.toString()}`)
}

export function fetchUnreadMessageCount() {
  return getApiResult<number>('/backend-api/v1/messages/unread-count')
}

export function markMessageRead(id: string) {
  return getApiResult<unknown>(`/backend-api/v1/messages/${id}/read`, { method: 'PUT' })
}

export function markAllMessagesRead() {
  return getApiResult<unknown>('/backend-api/v1/messages/read-all', { method: 'PUT' })
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
