import { useCallback, useEffect, useState } from 'react'
import { Mail, MailOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  fetchMyMessages,
  fetchUnreadMessageCount,
  formatDateTime,
  markAllMessagesRead,
  markMessageRead,
  type MyMessageRow
} from '@/features/system/message/api'

/** 未读数轮询间隔（与日历提醒铃铛一致；WebSocket 接入后改为事件驱动） */
const POLL_MS = 60_000
/** 下拉里最多展示多少条 */
const PREVIEW_SIZE = 8

/**
 * 顶栏消息铃铛（站内信个人侧）
 *
 * 数据来自 `/v1/messages/mine|unread-count`：管理端发送 + 系统通知都落在这里。
 * 未读数是环境信息（ambient），拉取失败一律静默降级为 0，不影响顶栏其它功能。
 */
export function MessageBell() {
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<MyMessageRow[]>([])
  const [open, setOpen] = useState(false)

  const refreshCount = useCallback(() => {
    fetchUnreadMessageCount()
      .then(setUnread)
      .catch(() => undefined)
  }, [])

  const loadList = useCallback(() => {
    fetchMyMessages({ page: 1, pageSize: PREVIEW_SIZE })
      .then(page => setItems(page.records ?? []))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    refreshCount()
    const timer = setInterval(refreshCount, POLL_MS)
    return () => clearInterval(timer)
  }, [refreshCount])

  const handleOpen = (next: boolean) => {
    setOpen(next)
    if (next) loadList()
  }

  const readOne = (row: MyMessageRow) => {
    if (row.isRead === 1) return
    markMessageRead(row.id)
      .then(() => {
        setItems(prev => prev.map(item => (item.id === row.id ? { ...item, isRead: 1 } : item)))
        setUnread(count => Math.max(0, count - 1))
        refreshCount()
      })
      .catch(() => undefined)
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8" aria-label="站内消息">
          <Mail className="size-4" />
          {unread > 0 && (
            <span className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-medium">我的消息</p>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-1.5 py-0.5 text-xs"
              onClick={() =>
                markAllMessagesRead()
                  .then(() => {
                    setItems(prev => prev.map(item => ({ ...item, isRead: 1 })))
                    setUnread(0)
                  })
                  .catch(() => undefined)
              }
            >
              全部已读
            </Button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">暂无消息</p>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {items.map(row => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => readOne(row)}
                  className={cn(
                    'hover:bg-accent/60 flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors',
                    row.isRead === 0 && 'bg-primary/5'
                  )}
                >
                  {row.isRead === 0 ? (
                    <Mail className="text-primary mt-0.5 size-4 shrink-0" />
                  ) : (
                    <MailOpen className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-sm', row.isRead === 0 && 'font-medium')}>{row.title}</span>
                    <span className="text-muted-foreground line-clamp-1 block text-xs">{row.content}</span>
                    <span className="text-muted-foreground text-[11px]">{formatDateTime(row.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
