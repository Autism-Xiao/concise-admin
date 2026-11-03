import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchCalendarEvents, type CalendarEvent } from './api'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

interface DayCell {
  /** YYYY-MM-DD */
  key: string
  day: number
  inMonth: boolean
  isToday: boolean
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`
}

/** 生成 42 格（6 周）月视图，周一开头 */
function buildMonth(year: number, month: number): DayCell[] {
  const today = toKey(new Date())
  const first = new Date(year, month, 1)
  // getDay: 0=周日 → 转为周一开头的偏移
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - offset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    return { key: toKey(d), day: d.getDate(), inMonth: d.getMonth() === month, isToday: toKey(d) === today }
  })
}

export function CalendarPage() {
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')

  const load = () => {
    setLoading(true)
    setError(null)
    fetchCalendarEvents()
      .then(setEvents)
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const cells = useMemo(() => buildMonth(cursor.year, cursor.month), [cursor])
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const ev of events) {
      const arr = map.get(ev.date) ?? []
      arr.push(ev)
      map.set(ev.date, arr)
    }
    return map
  }, [events])

  const shiftMonth = (delta: number) => {
    setCursor(prev => {
      const d = new Date(prev.year, prev.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  const backToToday = () => {
    const d = new Date()
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
  }

  const openAdd = (dayKey: string) => {
    setAdding(dayKey)
    setTitle('')
    setTime('')
  }

  const handleAdd = () => {
    if (!adding || !title.trim()) return
    setEvents(prev => [...prev, { id: prev.length ? Math.max(...prev.map(e => e.id)) + 1 : 1, date: adding, title: title.trim(), time: time || undefined }])
    toast.success(`已在 ${adding} 添加日程「${title.trim()}」`)
    setAdding(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">日历管理</h1>
          <p className="text-muted-foreground text-sm">点击任意日期添加日程（mock 数据）</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)}>
            <ChevronLeft />
            <span className="sr-only">上一月</span>
          </Button>
          <span className="min-w-28 text-center font-medium tabular-nums">
            {cursor.year} 年 {cursor.month + 1} 月
          </span>
          <Button variant="outline" size="icon" onClick={() => shiftMonth(1)}>
            <ChevronRight />
            <span className="sr-only">下一月</span>
          </Button>
          <Button variant="outline" onClick={backToToday}>
            今天
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <p className="text-muted-foreground text-sm">{error}</p>
            <Button variant="outline" onClick={load}>
              重试
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <div className="bg-border grid grid-cols-7 gap-px overflow-hidden rounded-md border">
              {WEEKDAYS.map(w => (
                <div key={w} className="bg-muted py-2 text-center text-sm font-medium">
                  周{w}
                </div>
              ))}
              {cells.map(cell => {
                const dayEvents = eventsByDay.get(cell.key) ?? []
                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => openAdd(cell.key)}
                    className={`group bg-background hover:bg-accent/50 flex min-h-24 flex-col items-stretch gap-1 p-1.5 text-left transition-colors ${cell.inMonth ? '' : 'opacity-40'}`}
                  >
                    <span
                      className={`flex size-6 items-center justify-center rounded-full text-sm ${
                        cell.isToday ? 'bg-primary text-primary-foreground font-semibold' : ''
                      }`}
                    >
                      {cell.day}
                    </span>
                    {dayEvents.slice(0, 2).map(ev => (
                      <span key={ev.id} className="bg-primary/10 text-primary truncate rounded px-1.5 py-0.5 text-xs">
                        {ev.time ? `${ev.time} ` : ''}
                        {ev.title}
                      </span>
                    ))}
                    {dayEvents.length > 2 && <span className="text-muted-foreground px-1 text-xs">还有 {dayEvents.length - 2} 项…</span>}
                    <span className="text-muted-foreground mt-auto hidden justify-end group-hover:flex">
                      <Plus className="size-4" />
                    </span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!adding} onOpenChange={v => !v && setAdding(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加日程 · {adding}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={e => {
              e.preventDefault()
              handleAdd()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="event-title">标题</Label>
              <Input id="event-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="请输入日程标题" required autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-time">时间（可选，留空为全天）</Label>
              <Input id="event-time" type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdding(null)}>
                取消
              </Button>
              <Button type="submit">保存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
