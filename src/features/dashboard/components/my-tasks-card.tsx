import { ChevronRight, ListTodo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MyTasksBlock } from '../api'

interface MyTasksCardProps {
  block: MyTasksBlock
  onOpenTasks: () => void
  /** 目标页面（/system/task）是否在当前角色菜单范围内 */
  canOpenTasks?: boolean
}

/** 三档主口径：待处理 / 进行中 / 已完成（已取消不占版面，避免首页出现"成功指标"） */
const METRICS: Array<{ key: 'pending' | 'doing' | 'done'; label: string; className: string }> = [
  { key: 'pending', label: '待处理', className: 'text-amber-600 dark:text-amber-400' },
  { key: 'doing', label: '进行中', className: 'text-primary' },
  { key: 'done', label: '已完成', className: 'text-emerald-600 dark:text-emerald-400' }
]

/**
 * 首页「我的待办」
 *
 * 数据来自 dashboard 聚合接口的 myTasks 块（task.assignee_id = 当前用户）。
 * scope='all' 时会额外统计未指派任务（服务端口径），卡片上用「含未指派」标注，避免数字对不上任务页。
 */
export function MyTasksCard({ block, onOpenTasks, canOpenTasks = true }: MyTasksCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListTodo className="text-muted-foreground size-4" />
          我的待办
          {block.scope === 'all' && <span className="text-muted-foreground text-xs font-normal">含未指派</span>}
        </CardTitle>
        {canOpenTasks && (
          <CardAction>
            <Button variant="link" size="sm" className="h-auto px-0" onClick={onOpenTasks}>
              全部
              <ChevronRight />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {METRICS.map(metric => (
            <button
              key={metric.key}
              type="button"
              // 无任务页权限时按钮仍可读，只是不跳转
              disabled={!canOpenTasks}
              onClick={onOpenTasks}
              className="hover:bg-accent/60 rounded-md border px-2 py-2 text-center transition-colors disabled:pointer-events-none"
            >
              <div className={`text-xl font-semibold tabular-nums ${metric.className}`}>{block[metric.key]}</div>
              <div className="text-muted-foreground text-xs">{metric.label}</div>
            </button>
          ))}
        </div>
        {block.pending + block.doing === 0 && (
          <p className="text-muted-foreground mt-2 text-center text-xs">{block.done > 0 ? '当前没有待办，历史任务均已完成' : '暂无指派给你的任务'}</p>
        )}
      </CardContent>
    </Card>
  )
}
