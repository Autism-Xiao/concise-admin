import { getJson } from '@/lib/http'

export interface CalendarEvent {
  id: number
  /** YYYY-MM-DD */
  date: string
  title: string
  /** 如 '14:00'，全天事件留空 */
  time?: string
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  return getJson<CalendarEvent[]>('/mock/calendar-events.json')
}
