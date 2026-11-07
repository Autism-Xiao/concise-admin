import { ArrowRight, ListTodo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { TaskBlock } from '../api'

interface MyTasksCardProps {
  block: TaskBlock
  onOpenTasks: () => void
}

const STATUS_ROWS = [
  { key: 'pending', label: '待处理', dot: 'bg-sky-500' },
  { key: 'doing', label: '进行中', dot: 'bg-amber-500' },
  { key: 'done', label: '已完成', dot: 'bg-emerald-500' },
  { key: 'cancelled', label: '已取消', dot: 'bg-muted-foreground/40' }
] as const

/**
 * 我的待办
 *
 * 空态要写清楚「为什么是空的」：没有任务权限的账号口径是「仅指派给我」，
 * 而 task.assignee_id 是 int、用户主键是 varchar(32)，两边还没对齐，
 * 所以大概率恒为 0 —— 空态文案要引导去任务看板，而不是让人以为页面坏了。
 */
export function MyTasksCard({ block, onOpenTasks }: MyTasksCardProps) {
  const total = block.pending + block.doing + block.done + block.cancelled
  const openCount = block.pending + block.doing

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListTodo className="text-muted-foreground size-4" />
          我的待办
        </CardTitle>
        <Button variant="link" size="sm" className="h-auto px-0" onClick={onOpenTasks}>
          任务看板
          <ArrowRight />
        </Button>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="text-muted-foreground space-y-1 py-4 text-center text-sm">
            <p>暂无任务</p>
            <p className="text-xs">
              {block.scope === 'all' ? '系统里还没有待办任务' : '当前口径只统计「指派给你」的任务'}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">{openCount}</span>
              <span className="text-muted-foreground text-xs">项待处理 / 进行中</span>
            </div>
            <div className="space-y-2">
              {STATUS_ROWS.map(row => (
                <div key={row.key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground inline-flex items-center gap-2">
                    <i className={cn('size-1.5 rounded-full', row.dot)} />
                    {row.label}
                  </span>
                  <span className="font-medium tabular-nums">{block[row.key]}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
