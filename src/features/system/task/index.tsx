import { useCallback, useMemo, useState } from 'react'
import { Ban, CheckCircle2, Pencil, Play, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { RefreshButton } from '@/components/ui/refresh-button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DictBadge } from '@/components/dict-badge'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useServerTable, type ServerTableQuery } from '@/components/data-table'
import { hasPermission } from '@/lib/auth'
import { useDict } from '@/lib/dict'
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
  // 优先级走字典（状态是状态机，保持写死）
  const priorityItems = useDict('sys_task_priority', TASK_PRIORITY_LABEL)
  const canListAll = hasPermission('system:task:list')
  const [scope, setScope] = useState<'all' | 'mine'>(canListAll ? 'all' : 'mine')
  const [statusFilter, setStatusFilter] = useState<'all' | `${TaskStatus}`>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | `${TaskPriority}`>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState<Task | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  /** 列表查询：搜索/优先级/状态/排序/翻页都由接口完成（「只看我的」走 /tasks/mine，同样支持） */
  const fetchPage = useCallback(
    ({ page, pageSize, keyword, filters, sortBy, sortOrder }: ServerTableQuery<{ status: string; priority: string; scope: 'all' | 'mine' }>) => {
      const params = {
        page,
        pageSize,
        keyword,
        status: filters.status === 'all' ? undefined : (Number(filters.status) as TaskStatus),
        priority: filters.priority === 'all' ? undefined : (Number(filters.priority) as TaskPriority),
        sortBy,
        sortOrder
      }
      return filters.scope === 'mine' ? fetchMyTasks(params) : fetchTasks(params)
    },
    []
  )

  const tableFilters = useMemo(
    () => ({ status: statusFilter, priority: priorityFilter, scope }),
    [statusFilter, priorityFilter, scope]
  )

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
    reload()
  }

  const handleStatus = (task: Task, next: TaskStatus) => {
    setBusyId(task.id)
    changeTaskStatus(task.id, next)
      .then(() => {
        toast.success(`「${task.title}」已变为${TASK_STATUS_LABEL[next]}`)
        reload()
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
      reload()
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
        // 文案和颜色都从字典 sys_task_priority 取，运营改色不用发版
        cell: ({ row }) => <DictBadge code="sys_task_priority" value={row.original.priority} />,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleStatus/busyId 变化时重建列以刷新禁用态；字典加载后重建以刷新标签
    [busyId, priorityItems]
  )

  const { table, keyword, setKeyword, loading, booted, error, total, reload } = useServerTable({
    columns,
    query: fetchPage,
    filters: tableFilters,
    getRowId: t => String(t.id)
  })

  // 分项计数只能统计当前页（服务端分页拿不到全量行），文案里明确写「本页」
  const pageRows = table.getRowModel().rows.map(row => row.original)
  const pendingCount = pageRows.filter(t => t.status === 0).length
  const doingCount = pageRows.filter(t => t.status === 1).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">任务管理</h1>
          <p className="text-muted-foreground text-sm">
            {loading
              ? '加载中…'
              : scope === 'mine'
                ? `我负责 ${total >= 0 ? total : 0} 个任务（本页待处理 ${pendingCount} 个、进行中 ${doingCount} 个）`
                : `共 ${total >= 0 ? total : 0} 个任务（本页待处理 ${pendingCount} 个、进行中 ${doingCount} 个）`}
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

      {!booted ? (
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
            <Button variant="outline" onClick={reload}>
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
                items={{ all: '全部优先级', ...priorityItems }}
              >
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部优先级</SelectItem>
                  {Object.entries(priorityItems).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <RefreshButton onClick={() => void reload()} />
              <DataTableViewOptions table={table} columnLabels={columnLabels} />
            </div>

            <DataTable
              table={table}
              loading={loading}
              emptyText={scope === 'mine' ? '还没有指派给你的任务' : '没有匹配的任务'}
            />
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
