export interface CalendarEvent {
  id: number
  /** YYYY-MM-DD */
  date: string
  title: string
  /** 如 '14:00'，全天事件留空 */
  time?: string
}

// 以相对当月生成，翻页演示时始终有数据
function thisMonth(day: number): string {
  const now = new Date()
  const m = `${now.getMonth() + 1}`.padStart(2, '0')
  return `${now.getFullYear()}-${m}-${`${day}`.padStart(2, '0')}`
}

export const events: CalendarEvent[] = [
  { id: 1, date: thisMonth(3), title: '产品评审会', time: '10:00' },
  { id: 2, date: thisMonth(6), title: '前端技术分享', time: '16:00' },
  { id: 3, date: thisMonth(11), title: '版本发布' },
  { id: 4, date: thisMonth(15), title: '客户拜访', time: '09:30' },
  { id: 5, date: thisMonth(15), title: '设计走查', time: '14:00' },
  { id: 6, date: thisMonth(20), title: '季度总结会', time: '10:00' },
  { id: 7, date: thisMonth(24), title: '团建活动' },
  { id: 8, date: thisMonth(28), title: '需求梳理', time: '15:00' }
]
