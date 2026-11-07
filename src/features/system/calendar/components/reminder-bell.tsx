import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Bell, BellOff, CheckCheck } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { fetchReminderMessages, fetchUnreadReminderCount, markAllRemindersRead, markReminderRead, type ReminderMessage } from '../api'

/** 未读数轮询间隔：提醒是异步推送的，太频繁浪费请求，1 分钟足够 */
const POLL_MS = 60_000
/** 下拉里最多展示多少条（更多的去日历页看） */
const PREVIEW_SIZE = 8

/** ISO → 相对时间（提醒场景看「多久之前」比看绝对时间更直观） */
function relativeTime(iso?: string | null): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  if (diff < 60_000) return '刚刚'
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  const d = new Date(t)
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 顶栏提醒铃铛
 *
 * 数据来自 `/v1/schedule/reminder/*`：日程到提醒点后由后端调度器落一条消息记录，
 * 这里只负责「展示未读数 + 列表 + 已读」。
 *
 * 未读数是环境信息（ambient），拉取失败一律静默降级为 0 ——
 * 不能因为提醒服务挂了就弹 toast 或影响顶栏其它功能。
 */
export function ReminderBell() {
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<ReminderMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const refreshCount = useCallback(() => {
    fetchUnreadReminderCount()
      .then(setUnread)
      .catch(() => undefined)
  }, [])

  const loadList = useCallback(() => {
    setLoading(true)
    fetchReminderMessages({ current: 1, size: PREVIEW_SIZE })
      .then(page => setItems(page.records ?? []))
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refreshCount()
    const timer = window.setInterval(refreshCount, POLL_MS)
    return () => window.clearInterval(timer)
  }, [refreshCount])

  // 每次展开都重拉一次：轮询只刷数字，列表要最新
  useEffect(() => {
    if (open) loadList()
  }, [open, loadList])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) refreshCount()
  }

  const handleClickItem = async (msg: ReminderMessage) => {
    const unreadFlag = !msg.isRead
    setOpen(false)
    // 先跳转再标已读：跳转是用户主要意图，不能被网络等待拖住
    void navigate({ to: '/system/calendar' })
    if (!unreadFlag) return
    try {
      await markReminderRead(msg.id)
      setItems(prev => prev.map(m => (m.id === msg.id ? { ...m, isRead: true } : m)))
      setUnread(prev => Math.max(prev - 1, 0))
    } catch {
      // 标已读失败不影响用户，下次刷新会纠正
      refreshCount()
    }
  }

  const handleReadAll = async () => {
    try {
      await markAllRemindersRead()
      setItems(prev => prev.map(m => ({ ...m, isRead: true })))
      setUnread(0)
    } catch {
      refreshCount()
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8" aria-label={unread > 0 ? `${unread} 条未读提醒` : '提醒消息'}>
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="bg-destructive absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold text-white tabular-nums">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">提醒消息</span>
          <button
            type="button"
            onClick={() => void handleReadAll()}
            disabled={unread === 0}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCheck className="size-3.5" />
            全部已读
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading && items.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">加载中…</p>
          ) : items.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-sm">
              <BellOff className="size-6 opacity-50" />
              暂无提醒消息
            </div>
          ) : (
            items.map(msg => {
              const unreadFlag = !msg.isRead
              return (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => void handleClickItem(msg)}
                  className="hover:bg-accent/60 flex w-full items-start gap-2 border-b px-3 py-2.5 text-left last:border-b-0"
                >
                  <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', unreadFlag ? 'bg-destructive' : 'bg-transparent')} />
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className={cn('block truncate text-sm', unreadFlag ? 'font-medium' : 'text-muted-foreground')}>{msg.title}</span>
                    {msg.message && <span className="text-muted-foreground block truncate text-xs">{msg.message}</span>}
                    <span className="text-muted-foreground block text-[11px]">{relativeTime(msg.createTime)}</span>
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div className="border-t px-3 py-1.5">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              void navigate({ to: '/system/calendar' })
            }}
            className="text-muted-foreground hover:text-foreground w-full py-1 text-center text-xs"
          >
            打开日历
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
