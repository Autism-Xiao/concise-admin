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

/** 修改日程（remindAt 传 null 取消提醒） */
export function updateCalendarEvent(
  id: number,
  payload: Partial<CreateEventPayload> & { remindAt?: string | null }
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
