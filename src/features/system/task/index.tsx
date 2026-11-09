import { useEffect, useMemo, useState } from 'react'
import { Ban, CheckCircle2, Pencil, Play, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useDataTable } from '@/components/data-table'
import { hasPermission } from '@/lib/auth'
import { TaskFormDialog } from './components/task-form-dialog'
import {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TASK_STATUS_TRANSITIONS,
  TASK_UNASSIGNED,
  changeTaskStatus,
  createTask,
  deleteTask,
  describeDueDate,
  fetchMyTasks,
  fetchTasks,
  formatDateTime,
  updateTask,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type TaskWritePayload
} from './api'

const columnLabels: Record<string, string> = {
  title: '标题',
  assigneeName: '负责人',
  priority: '优先级',
  status: '状态',
  dueDate: '截止时间',
  createdAt: '创建时间',
  description: '描述'
}

const priorityClass: Record<TaskPriority, string> = {
  2: 'bg-destructive/15 text-destructive',
  1: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  0: 'bg-muted text-muted-foreground'
}

const statusClass: Record<TaskStatus, string> = {
  0: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  1: 'bg-primary/10 text-primary',
  2: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  3: 'bg-muted text-muted-foreground'
}

/** 状态流转按钮：目标状态 → 文案与图标（只有状态机允许的目标才渲染） */
const TRANSITION_ACTIONS: Record<number, { label: string; icon: typeof Play }> = {
  0: { label: '重开', icon: RotateCcw },
  1: { label: '开始', icon: Play },
  2: { label: '完成', icon: CheckCircle2 },
  3: { label: '取消', icon: Ban }
}

export function TaskPage() {
  const canListAll = hasPermission('system:task:list')
  const [scope, setScope] = useState<'all' | 'mine'>(canListAll ? 'all' : 'mine')
  const [list, setList] = useState<Task[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | `${TaskStatus}`>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | `${TaskPriority}`>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState<Task | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    // 一次拉满 100 条，表格内本地筛选（任务量级远小于用户表，不必服务端翻页）
    const request = scope === 'mine' ? fetchMyTasks({ pageSize: 100 }) : fetchTasks({ pageSize: 100 })
    request
      .then(res => {
        setList(res.records ?? [])
        setTotal(res.total ?? 0)
      })
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [scope])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (task: Task) => {
    setEditing(task)
    setFormOpen(true)
  }

  const handleSubmit = async (values: TaskWritePayload) => {
    if (editing) {
      await updateTask(editing.id, values)
      toast.success('任务已更新')
    } else {
      await createTask(values)
      toast.success(values.assigneeId && values.assigneeId !== TASK_UNASSIGNED ? '任务已创建并指派' : '任务已创建（未指派）')
    }
    setFormOpen(false)
    load()
  }

  const handleStatus = (task: Task, next: TaskStatus) => {
    setBusyId(task.id)
    changeTaskStatus(task.id, next)
      .then(() => {
        toast.success(`「${task.title}」已变为${TASK_STATUS_LABEL[next]}`)
        load()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '操作失败'))
      .finally(() => setBusyId(null))
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteTask(deleting.id)
      toast.success(`已删除任务「${deleting.title}」`)
      setDeleting(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title="任务" />,
        cell: ({ row }) => {
          const task = row.original
          return (
            <div className="min-w-0">
              <span className="font-medium">{task.title}</span>
              {task.description && <p className="text-muted-foreground line-clamp-1 max-w-80 text-xs">{task.description}</p>}
            </div>
          )
        }
      },
      {
        accessorKey: 'assigneeName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="负责人" />,
        cell: ({ row }) => {
          const task = row.original
          if (!task.assigneeId || task.assigneeId === TASK_UNASSIGNED) {
            return <span className="text-muted-foreground text-xs">未指派</span>
          }
          // 有 ID 但翻译不出姓名 = 用户已删或跨租户，如实标红而不是假装未指派
          if (!task.assigneeName) return <span className="text-destructive text-xs">用户已删除</span>
          return <span className="text-sm">{task.assigneeName}</span>
        }
      },
      {
        accessorKey: 'priority',
        header: ({ column }) => <DataTableColumnHeader column={column} title="优先级" />,
        cell: ({ row }) => (
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${priorityClass[row.original.priority] ?? priorityClass[1]}`}>
            {TASK_PRIORITY_LABEL[row.original.priority] ?? '-'}
          </span>
        ),
        filterFn: (row, id, value) => String(row.getValue(id)) === value
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="状态" />,
        cell: ({ row }) => (
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${statusClass[row.original.status] ?? statusClass[0]}`}>
            {TASK_STATUS_LABEL[row.original.status] ?? '-'}
          </span>
        ),
        filterFn: (row, id, value) => String(row.getValue(id)) === value
      },
      {
        accessorKey: 'dueDate',
        header: ({ column }) => <DataTableColumnHeader column={column} title="截止时间" />,
        cell: ({ row }) => {
          const due = describeDueDate(row.original.dueDate)
          if (!due) return <span className="text-muted-foreground text-xs">—</span>
          return (
            <div className="whitespace-nowrap">
              <div className="text-muted-foreground text-xs tabular-nums">{formatDateTime(row.original.dueDate)}</div>
              <div className={`text-xs ${due.overdue ? 'text-destructive' : 'text-muted-foreground/80'}`}>{due.text}</div>
            </div>
          )
        }
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="创建时间" />,
        cell: ({ row }) => <span className="text-muted-foreground whitespace-nowrap text-xs tabular-nums">{formatDateTime(row.original.createdAt)}</span>
      },
      {
        id: 'actions',
        header: () => <div className="text-end">操作</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const task = row.original
          const busy = busyId === task.id
          const nexts = TASK_STATUS_TRANSITIONS[task.status] ?? []
          return (
            <div className="flex items-center justify-end gap-0.5">
              {hasPermission('system:task:update') &&
                nexts.map(next => {
                  const action = TRANSITION_ACTIONS[next]
                  if (!action) return null
                  const Icon = action.icon
                  return (
                    <Button
                      key={next}
                      variant="ghost"
                      size="icon"
                      disabled={busy}
                      title={action.label}
                      className={next === 3 ? 'text-muted-foreground' : next === 2 ? 'text-emerald-600' : 'text-primary'}
                      onClick={() => handleStatus(task, next)}
                    >
                      <Icon className="size-4" />
                      <span className="sr-only">{action.label}</span>
                    </Button>
                  )
                })}
              {hasPermission('system:task:update') && (
                <Button variant="ghost" size="icon" title="编辑" onClick={() => openEdit(task)}>
                  <Pencil className="size-4" />
                  <span className="sr-only">编辑</span>
                </Button>
              )}
              {hasPermission('system:task:delete') && (
                <Button variant="ghost" size="icon" title="删除" onClick={() => setDeleting(task)}>
                  <Trash2 className="text-destructive size-4" />
                  <span className="sr-only">删除</span>
                </Button>
              )}
            </div>
          )
        }
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleStatus/busyId 变化时重建列以刷新禁用态
    [busyId]
  )

  const columnFilters = useMemo(() => {
    const filters: Array<{ id: string; value: string }> = []
    if (statusFilter !== 'all') filters.push({ id: 'status', value: statusFilter })
    if (priorityFilter !== 'all') filters.push({ id: 'priority', value: priorityFilter })
    return filters
  }, [statusFilter, priorityFilter])

  const { table, keyword, setKeyword } = useDataTable({ data: list, columns, columnFilters, getRowId: t => String(t.id) })

  const pendingCount = list.filter(t => t.status === 0).length
  const doingCount = list.filter(t => t.status === 1).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">任务管理</h1>
          <p className="text-muted-foreground text-sm">
            {loading
              ? '加载中…'
              : scope === 'mine'
                ? `我负责 ${total} 个任务，其中待处理 ${pendingCount} 个、进行中 ${doingCount} 个`
                : `共 ${total} 个任务${total > list.length ? `（当前展示最近 ${list.length} 条）` : ''}，待处理 ${pendingCount} 个、进行中 ${doingCount} 个`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canListAll && scope === 'mine' && (
            <Button variant="outline" onClick={() => setScope('all')}>
              查看全部任务
            </Button>
          )}
          {hasPermission('system:task:add') && (
            <Button onClick={openCreate}>
              <Plus />
              新增任务
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-9 w-full max-w-md" />
            <Skeleton className="h-64 w-full" />
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
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full max-w-xs">
                <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
                <Input placeholder="搜索标题 / 描述" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
              <Select
                value={scope}
                onValueChange={v => setScope(v as 'all' | 'mine')}
                items={{ all: '全部任务', mine: '我负责的' }}
              >
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {canListAll && <SelectItem value="all">全部任务</SelectItem>}
                  <SelectItem value="mine">我负责的</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={v => setStatusFilter(v as 'all' | `${TaskStatus}`)}
                items={{ all: '全部状态', '0': '待处理', '1': '进行中', '2': '已完成', '3': '已取消' }}
              >
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="0">待处理</SelectItem>
                  <SelectItem value="1">进行中</SelectItem>
                  <SelectItem value="2">已完成</SelectItem>
                  <SelectItem value="3">已取消</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={priorityFilter}
                onValueChange={v => setPriorityFilter(v as 'all' | `${TaskPriority}`)}
                items={{ all: '全部优先级', '0': '低', '1': '中', '2': '高' }}
              >
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部优先级</SelectItem>
                  <SelectItem value="0">低</SelectItem>
                  <SelectItem value="1">中</SelectItem>
                  <SelectItem value="2">高</SelectItem>
                </SelectContent>
              </Select>
              <DataTableViewOptions table={table} columnLabels={columnLabels} />
            </div>

            <DataTable table={table} emptyText={scope === 'mine' ? '还没有指派给你的任务' : '没有匹配的任务'} />
            <DataTablePagination table={table} />
          </CardContent>
        </Card>
      )}

      {formOpen && <TaskFormDialog key={editing?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} task={editing} onSubmit={handleSubmit} />}

      <ConfirmDialog
        confirmText="删除"
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除任务「{deleting?.title}」，该操作不可恢复。</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}
