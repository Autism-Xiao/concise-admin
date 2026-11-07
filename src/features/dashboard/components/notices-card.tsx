import { ChevronRight, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatRelativeTime, type NoticeRow } from '../api'

interface NoticesCardProps {
  rows: NoticeRow[]
  onOpenNotices: () => void
  /** 目标页面（/system/notice）是否在当前角色菜单范围内 */
  canOpenNotices?: boolean
}

/** 优先级配色：H 高（红）/ M 中（琥珀）/ L 低（灰） */
const PRIORITY_STYLE: Record<string, { label: string; className: string }> = {
  H: { label: '高', className: 'bg-destructive/10 text-destructive' },
  M: { label: '中', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  L: { label: '低', className: 'bg-muted text-muted-foreground' }
}

/** 最新公告（只取已发布的，最多 5 条） */
export function NoticesCard({ rows, onOpenNotices, canOpenNotices = true }: NoticesCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="text-muted-foreground size-4" />
          通知公告
        </CardTitle>
        {canOpenNotices && (
          <CardAction>
            <Button variant="link" size="sm" className="h-auto px-0" onClick={onOpenNotices}>
              全部
              <ChevronRight />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-1">
        {rows.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">暂无已发布的公告</p>
        ) : (
          rows.map(row => {
            const priority = PRIORITY_STYLE[row.priority] ?? PRIORITY_STYLE.M
            return (
              <button
                key={row.id}
                type="button"
                onClick={onOpenNotices}
                className="hover:bg-accent/60 -mx-1 flex w-[calc(100%+0.5rem)] items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
              >
                <span className={cn('mt-0.5 shrink-0 rounded px-1 py-0.5 text-[10px] font-medium', priority.className)}>
                  {priority.label}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{row.title}</span>
                  <span className="text-muted-foreground text-xs">{formatRelativeTime(row.sendTime)}</span>
                </span>
              </button>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
