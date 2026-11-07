import { getApiResult } from '@/lib/http'

const BASE = '/backend-api/v1/schedule'

export interface Calendar {
  id: number
  name: string
  color: string
  ownerId: string
  isPublic: boolean
}

export interface CalendarEvent {
  id: number
  calendarId: number
  userId: string
  /** YYYY-MM-DD */
  date: string
  title: string
  /** 如 '14:00'，全天事件留空 */
  time?: string
  category?: string | null
  /** ISO8601，空为不提醒 */
  remindAt?: string | null
  /** 提醒方式，当前仅 SOCKET（站内消息） */
  remindType?: string | null
  /** 后端幂等标记：true 表示提醒已经推送过（tinyint 可能是 0/1，判断时用 Boolean() 包一层） */
  isReminded?: boolean | number | null
}

/** 确保有默认日历（无则自动创建「我的日程」），返回日历 */
export function ensureDefaultCalendar(): Promise<Calendar> {
  return getApiResult<Calendar>(`${BASE}/calendars/ensure-default`, { method: 'POST' })
}

/** 区间查询日程（月视图用），按开始时间升序 */
export async function fetchCalendarEvents(startDate: string, endDate: string): Promise<CalendarEvent[]> {
  const rows = await getApiResult<
    (Omit<CalendarEvent, 'time' | 'date'> & { startTime: string; endTime: string })[]
  >(`${BASE}/events?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`)
  return rows.map(e => {
    const time = e.startTime.slice(11, 16)
    const endTime = e.endTime.slice(11, 16)
    return {
      ...e,
      date: e.startTime.slice(0, 10),
      time: time === '00:00' && endTime === '00:00' ? undefined : time
    }
  })
}

export interface CreateEventPayload {
  calendarId: number
  title: string
  startTime: string
  endTime: string
  category?: string
  /** ISO8601 提醒时间点，不传=不提醒 */
  remindAt?: string
}

export function createCalendarEvent(payload: CreateEventPayload): Promise<CalendarEvent> {
  return getApiResult<CalendarEvent>(`${BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

/**
 * 修改日程（remindAt 传 null 取消提醒）
 *
 * 注意必须 Omit 掉 CreateEventPayload 里的 remindAt 再重声明：
 * 直接交叉 `Partial<CreateEventPayload> & { remindAt?: string | null }`
 * 会把 `string` 和 `string | null` 求交成 `string`，null 传不进去。
 */
export function updateCalendarEvent(
  id: number,
  payload: Omit<Partial<CreateEventPayload>, 'remindAt'> & { remindAt?: string | null }
): Promise<CalendarEvent> {
  return getApiResult<CalendarEvent>(`${BASE}/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function deleteCalendarEvent(id: number): Promise<void> {
  return getApiResult<null>(`${BASE}/events/${id}`, { method: 'DELETE' }).then(() => undefined)
}

/* ---------------- 站内提醒消息（顶栏铃铛） ---------------- */

/** 提醒推送记录（日程触发后由后端落库） */
export interface ReminderMessage {
  id: number
  eventId: number
  userId: string
  title: string
  message?: string | null
  /** tinyint，可能 0/1，判断时用 Boolean() 包一层 */
  isRead?: boolean | number | null
  readAt?: string | null
  createTime?: string | null
}

export interface ReminderPage {
  records: ReminderMessage[]
  total: number
  current: number
  size: number
  pages: number
}

/** 未读条数（顶栏红点） */
export function fetchUnreadReminderCount(): Promise<number> {
  return getApiResult<number>(`${BASE}/reminder/unread-count`).then(n => Number(n) || 0)
}

/** 提醒消息分页列表（按推送时间倒序） */
export function fetchReminderMessages(params: { current?: number; size?: number; isRead?: boolean } = {}): Promise<ReminderPage> {
  const qs = new URLSearchParams()
  qs.set('current', String(params.current ?? 1))
  qs.set('size', String(params.size ?? 20))
  if (params.isRead !== undefined) qs.set('isRead', String(params.isRead))
  return getApiResult<ReminderPage>(`${BASE}/reminder/list?${qs.toString()}`)
}

/** 单条已读 */
export function markReminderRead(id: number): Promise<{ updated: number }> {
  return getApiResult<{ updated: number }>(`${BASE}/reminder/${id}/read`, { method: 'PUT' })
}

/** 全部已读 */
export function markAllRemindersRead(): Promise<{ updated: number }> {
  return getApiResult<{ updated: number }>(`${BASE}/reminder/read-all`, { method: 'PUT' })
}
