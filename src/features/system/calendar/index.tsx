import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlarmClock, Bell, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { cn } from 'cn'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { createCalendarEvent, deleteCalendarEvent, ensureDefaultCalendar, fetchCalendarEvents, updateCalendarEvent, type CalendarEvent } from './api'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

/** 提醒提前量：value 存分钟数（'0' = 准时），'none' = 不提醒 */
const REMIND_OPTIONS = [
  { value: 'none', label: '不提醒', minutes: 0 },
  { value: '0', label: '准时提醒', minutes: 0 },
  { value: '15', label: '提前 15 分钟', minutes: 15 },
  { value: '60', label: '提前 1 小时', minutes: 60 },
  { value: '1440', label: '提前 1 天', minutes: 1440 }
]

/** Select 需要 value → 文案 的映射（Base UI 的 items 用法） */
const REMIND_LABELS: Record<string, string> = Object.fromEntries(REMIND_OPTIONS.map(o => [o.value, o.label]))

/** 日程的提醒状态：没有提醒 / 待触发 / 已触发过 */
type RemindState = 'none' | 'pending' | 'fired'

function remindStateOf(ev: CalendarEvent): RemindState {
  if (!ev.remindAt) return 'none'
  // 后端存的是 tinyint，可能是 0/1 也可能是布尔值，按真值判断即可
  return ev.isReminded ? 'fired' : 'pending'
}

/** ISO → '11-10 08:45'（按用户本地时区展示） */
function formatRemindAt(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 距离提醒触发还剩多久（「待提醒」面板的倒计时文案） */
function formatCountdown(iso?: string | null): { text: string; urgent: boolean; overdue: boolean } {
  if (!iso) return { text: '', urgent: false, overdue: false }
  const target = new Date(iso).getTime()
  if (Number.isNaN(target)) return { text: '', urgent: false, overdue: false }
  const diff = target - Date.now()
  // 已过提醒点但还没被巡逻补发：调度器每 3 分钟兜底一次，这里如实显示
  if (diff <= 0) return { text: '已到点，等待推送', urgent: true, overdue: true }
  const minutes = Math.ceil(diff / 60000)
  if (minutes < 60) return { text: `还剩 ${minutes} 分钟`, urgent: true, overdue: false }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    const rest = minutes % 60
    return { text: rest ? `还剩 ${hours} 小时 ${rest} 分` : `还剩 ${hours} 小时`, urgent: false, overdue: false }
  }
  return { text: `还剩 ${Math.floor(hours / 24)} 天`, urgent: false, overdue: false }
}

/**
 * 标题旁的提醒徽章
 *
 * 红底铃铛 = 已设提醒、还没到点（待触发）；灰色 = 已经推送过。
 * 没有提醒的日程不渲染，避免每个 chip 都挂一个空位。
 */
function ReminderBadge({ state, remindAt }: { state: RemindState; remindAt?: string | null }) {
  if (state === 'none') return null
  const pending = state === 'pending'
  const when = formatRemindAt(remindAt)
  const tip = pending ? (when ? `${when} 站内提醒（待触发）` : '已设置提醒') : when ? `${when} 已提醒` : '已提醒'
  return (
    <span
      title={tip}
      aria-label={tip}
      className={cn(
        'inline-flex size-3.5 shrink-0 items-center justify-center rounded-full',
        pending ? 'bg-destructive text-white' : 'bg-muted-foreground/25 text-muted-foreground'
      )}
    >
      <Bell className="size-2.5" strokeWidth={3} />
    </span>
  )
}

interface DayCell {
  /** YYYY-MM-DD */
  key: string
  day: number
  inMonth: boolean
  isToday: boolean
}

/**
 * 「待提醒」面板：本月所有还没触发的提醒，按触发时间升序
 *
 * 只列 pending，已推送过的日程在这里没意义（它已经通知过了）。
 * 支持两个操作：推迟 15 分钟（改 remindAt，后端会重置 is_reminded 并重挂定时器）、
 * 取消提醒（remindAt 置 null，日程本身保留）。
 */
function PendingRemindersPanel({
  items,
  busyId,
  onSnooze,
  onCancel,
  onLocate
}: {
  items: CalendarEvent[]
  busyId: number | null
  onSnooze: (ev: CalendarEvent) => void
  onCancel: (ev: CalendarEvent) => void
  onLocate: (dateKey: string) => void
}) {
  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="text-destructive size-4" />
          本月待提醒
          <span className="bg-destructive ml-1 rounded-full px-1.5 py-0.5 text-[11px] leading-none font-semibold text-white tabular-nums">
            {items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">本月没有待触发的提醒</p>
        ) : (
          items.map(ev => {
            const countdown = formatCountdown(ev.remindAt)
            const busy = busyId === ev.id
            return (
              <div key={ev.id} className="bg-muted/40 hover:bg-muted/70 space-y-1.5 rounded-md border p-2.5 transition-colors">
                <button
                  type="button"
                  onClick={() => onLocate(ev.date)}
                  className="block w-full truncate text-left text-sm font-medium hover:underline"
                  title="点击定位到该日期"
                >
                  {ev.title}
                </button>
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <AlarmClock className="size-3.5 shrink-0" />
                  <span className="tabular-nums">{formatRemindAt(ev.remindAt)}</span>
                  <span className={cn('rounded px-1 py-0.5 font-medium', countdown.urgent ? 'bg-destructive/10 text-destructive' : 'bg-background')}>
                    {countdown.text}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" className="h-6 px-2 text-xs" disabled={busy} onClick={() => onSnooze(ev)}>
                    {busy ? '处理中…' : '推迟 15 分钟'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive h-6 px-2 text-xs"
                    disabled={busy}
                    onClick={() => onCancel(ev)}
                  >
                    取消提醒
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
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

/** 默认日历缓存（模块级，避免重复 ensure） */
let defaultCalendarId: number | null = null

async function getDefaultCalendarId(): Promise<number> {
  if (defaultCalendarId) return defaultCalendarId
  const cal = await ensureDefaultCalendar()
  defaultCalendarId = Number(cal.id)
  return defaultCalendarId
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
  /** 提醒提前量，取值见 REMIND_OPTIONS（'none' = 不提醒） */
  const [remind, setRemind] = useState('none')
  const [saving, setSaving] = useState(false)
  /** 正在改提醒的日程 id（面板里按行禁用按钮，避免连点重复提交） */
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    const first = new Date(cursor.year, cursor.month, 1)
    const last = new Date(cursor.year, cursor.month + 1, 0)
    fetchCalendarEvents(toKey(first), toKey(last))
      .then(setEvents)
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }, [cursor])

  useEffect(load, [load])

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

  /** 本月待触发提醒（按提醒点升序），供右侧面板与顶部计数使用 */
  const pendingEvents = useMemo(
    () =>
      events
        .filter(ev => remindStateOf(ev) === 'pending')
        .sort((a, b) => (a.remindAt ?? '').localeCompare(b.remindAt ?? '')),
    [events]
  )

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
    setRemind('none')
  }

  const handleAdd = async () => {
    if (!adding || !title.trim() || saving) return
    setSaving(true)
    try {
      const calendarId = await getDefaultCalendarId()
      const [h, m] = (time || '09:00').split(':').map(Number)
      const startISO = `${adding}T${`${h}`.padStart(2, '0')}:${`${m ?? 0}`.padStart(2, '0')}:00+08:00`
      const end = time ? new Date(new Date(startISO).getTime() + 3600000) : new Date(`${adding}T18:00:00+08:00`)
      const pad = (n: number) => `${n}`.padStart(2, '0')
      const endISO = `${toKey(end)}T${pad(end.getHours())}:${pad(end.getMinutes())}:00+08:00`
      // 提醒点 = 开始时间 - 提前量；'none' 不传 remindAt（后端按空值处理成不提醒）
      const offset = REMIND_OPTIONS.find(o => o.value === remind)
      const remindAt =
        offset && offset.value !== 'none' ? new Date(new Date(startISO).getTime() - offset.minutes * 60000).toISOString() : undefined
      const created = await createCalendarEvent({
        calendarId,
        title: title.trim(),
        startTime: startISO,
        endTime: endISO,
        category: '待办',
        remindAt
      })
      setEvents(prev => [
        ...prev,
        {
          ...created,
          id: Number(created.id),
          calendarId: Number(created.calendarId),
          date: adding,
          time: time || undefined,
          isReminded: false
        }
      ])
      toast.success(remindAt ? `已添加日程「${title.trim()}」，${offset?.label ?? '按设定时间'}站内提醒` : `已在 ${adding} 添加日程「${title.trim()}」`)
      setAdding(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '添加失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (ev: CalendarEvent) => {
    if (!window.confirm(`删除日程「${ev.title}」？`)) return
    try {
      await deleteCalendarEvent(ev.id)
      setEvents(prev => prev.filter(e => e.id !== ev.id))
      toast.success('日程已删除')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  /** 局部更新一条日程，避免为了改提醒状态而整月重拉 */
  const patchEvent = (id: number, patch: Partial<CalendarEvent>) => {
    setEvents(prev => prev.map(e => (e.id === id ? { ...e, ...patch } : e)))
  }

  /** 推迟 15 分钟：改 remindAt 即可，后端会把 is_reminded 重置并重挂定时器 */
  const handleSnooze = async (ev: CalendarEvent) => {
    if (busyId) return
    setBusyId(ev.id)
    const next = new Date(Date.now() + 15 * 60000).toISOString()
    try {
      await updateCalendarEvent(ev.id, { remindAt: next })
      patchEvent(ev.id, { remindAt: next, isReminded: false })
      toast.success(`「${ev.title}」的提醒已推迟到 ${formatRemindAt(next)}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '推迟失败')
    } finally {
      setBusyId(null)
    }
  }

  /** 取消提醒：只清 remindAt，日程本身保留 */
  const handleCancelRemind = async (ev: CalendarEvent) => {
    if (busyId) return
    setBusyId(ev.id)
    try {
      await updateCalendarEvent(ev.id, { remindAt: null })
      patchEvent(ev.id, { remindAt: null, isReminded: false })
      toast.success(`已取消「${ev.title}」的提醒`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '取消提醒失败')
    } finally {
      setBusyId(null)
    }
  }

  /** 面板里点标题：跳到那条日程所在月份 */
  const locateDate = (dateKey: string) => {
    const [y, m] = dateKey.split('-').map(Number)
    if (y && m) setCursor({ year: y, month: m - 1 })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">日历管理</h1>
          <p className="text-muted-foreground text-sm">
            点击任意日期添加日程，点日程可删除；标题旁的<span className="text-destructive font-medium">红色铃铛</span>
            表示已设置站内提醒（灰色=已推送），日期右上角的<span className="text-destructive font-medium">红色数字</span>
            是当天待提醒条数
          </p>
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
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
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
                  // 当天还有几条提醒没触发：日期右上角挂数字角标，扫一眼就知道哪天有提醒
                  const pendingReminders = dayEvents.filter(ev => remindStateOf(ev) === 'pending').length
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => openAdd(cell.key)}
                      className={`group bg-background hover:bg-accent/50 flex min-h-24 flex-col items-stretch gap-1 p-1.5 text-left transition-colors ${cell.inMonth ? '' : 'opacity-40'}`}
                    >
                      <div className="flex items-start justify-between">
                        <span
                          className={`flex size-6 items-center justify-center rounded-full text-sm ${
                            cell.isToday ? 'bg-primary text-primary-foreground font-semibold' : ''
                          }`}
                        >
                          {cell.day}
                        </span>
                        {pendingReminders > 0 && (
                          <span
                            title={`当天有 ${pendingReminders} 条待提醒日程`}
                            aria-label={`当天有 ${pendingReminders} 条待提醒日程`}
                            className="bg-destructive mt-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold text-white tabular-nums"
                          >
                            {pendingReminders > 9 ? '9+' : pendingReminders}
                          </span>
                        )}
                      </div>
                      {dayEvents.slice(0, 2).map(ev => (
                        <span
                          key={ev.id}
                          role="button"
                          tabIndex={0}
                          onClick={e => {
                            e.stopPropagation()
                            void handleDelete(ev)
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation()
                              void handleDelete(ev)
                            }
                          }}
                          title="点击删除"
                          className="group/chip bg-primary/10 text-primary hover:bg-destructive/10 hover:text-destructive flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-xs"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {ev.time ? `${ev.time} ` : ''}
                            {ev.title}
                          </span>
                          <ReminderBadge state={remindStateOf(ev)} remindAt={ev.remindAt} />
                          <X className="hidden size-3 shrink-0 group-hover/chip:block" />
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
          <PendingRemindersPanel
            items={pendingEvents}
            busyId={busyId}
            onSnooze={ev => void handleSnooze(ev)}
            onCancel={ev => void handleCancelRemind(ev)}
            onLocate={locateDate}
          />
        </div>
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
              void handleAdd()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="event-title">标题</Label>
              <Input id="event-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="请输入日程标题" required autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-time">时间（可选，留空为全天 09:00-18:00）</Label>
              <Input id="event-time" type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>提醒</Label>
              <Select value={remind} onValueChange={setRemind} items={REMIND_LABELS}>
                <SelectTrigger>
                  <SelectValue placeholder="选择提醒时间" />
                </SelectTrigger>
                <SelectContent>
                  {REMIND_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">到点后会在站内推送一条提醒消息，日程标题旁会显示铃铛标记</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdding(null)}>
                取消
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
