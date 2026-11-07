import { ArrowRight, CheckCircle2, ScrollText, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRelativeTime, type RecentOpersBlock } from '../api'

interface RecentOpersCardProps {
  block: RecentOpersBlock
  onOpenLogs: () => void
}

/**
 * 最近操作
 *
 * 后端已经把 log_content 截断到 80 字、并且不返回 params / error_msg，
 * 所以这里可以直接展示（详情页才有完整参数）。
 */
export function RecentOpersCard({ block, onOpenLogs }: RecentOpersCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="text-muted-foreground size-4" />
          最近操作
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs font-normal">
            {block.scope === 'all' ? '全站' : '仅我的'}
          </span>
        </CardTitle>
        <Button variant="link" size="sm" className="h-auto px-0" onClick={onOpenLogs}>
          操作日志
          <ArrowRight />
        </Button>
      </CardHeader>
      <CardContent>
        {block.rows.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">还没有操作记录</p>
        ) : (
          <ul className="divide-border divide-y">
            {block.rows.map(row => {
              const failed = row.status === 1
              return (
                <li key={row.id} className="flex items-start gap-2.5 py-2 first:pt-0 last:pb-0">
                  {failed ? (
                    <XCircle className="text-destructive mt-0.5 size-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{row.content}</p>
                    <p className="text-muted-foreground text-xs">
                      {row.operator}
                      {row.ip ? ` · ${row.ip}` : ''}
                      {row.costTime > 0 ? ` · ${row.costTime}ms` : ''}
                    </p>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
                    {formatRelativeTime(row.time)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
