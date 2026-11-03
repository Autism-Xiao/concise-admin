import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CircleDashed, CheckCircle2, Circle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchTasks, type Task, type TaskPriority, type TaskStatus } from './api'

const PAGE_SIZE = 9

const statusMap: Record<TaskStatus, { label: string; icon: typeof Circle; className: string }> = {
  todo: { label: '待处理', icon: Circle, className: 'text-muted-foreground' },
  'in-progress': { label: '进行中', icon: CircleDashed, className: 'text-sky-600 dark:text-sky-400' },
  done: { label: '已完成', icon: CheckCircle2, className: 'text-emerald-600 dark:text-emerald-400' },
  canceled: { label: '已取消', icon: XCircle, className: 'text-muted-foreground' }
}

const priorityMap: Record<TaskPriority, { label: string; className: string }> = {
  low: { label: '低', className: 'bg-muted text-muted-foreground' },
  medium: { label: '中', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  high: { label: '高', className: 'bg-destructive/15 text-destructive' }
}

function TasksSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-3 py-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchTasks()
      .then(setTasks)
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const list = useMemo(() => tasks ?? [], [tasks])
  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageTasks = useMemo(() => list.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [list, safePage])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">任务</h1>
        <p className="text-muted-foreground text-sm">共 {list.length} 个任务（mock 数据）</p>
      </div>

      {loading ? (
        <TasksSkeleton />
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
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageTasks.map(task => {
              const status = statusMap[task.status]
              const priority = priorityMap[task.priority]
              const StatusIcon = status.icon
              return (
                <Card key={task.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="space-y-3 py-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-mono text-xs">{task.id}</span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priority.className}`}>{priority.label}优先级</span>
                    </div>
                    <p className="leading-snug font-medium">{task.title}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`inline-flex items-center gap-1.5 ${status.className}`}>
                        <StatusIcon className="size-4" />
                        {status.label}
                      </span>
                      <span className="text-muted-foreground text-xs">{task.assignee}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              第 {safePage} / {pageCount} 页
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                <ChevronLeft />
                上一页
              </Button>
              <Button variant="outline" size="sm" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>
                下一页
                <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
