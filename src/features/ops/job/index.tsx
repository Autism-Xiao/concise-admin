import { useEffect, useMemo, useState } from 'react'
import { CirclePause, CirclePlay, Pencil, Play, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { StatusBadge } from '@/components/status-badge'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useDataTable } from '@/components/data-table'
import { hasPermission } from '@/lib/auth'
import { JobFormDialog } from './components/job-form-dialog'
import {
  createJob,
  deleteJob,
  fetchJobs,
  formatDateTime,
  JOB_STATUS_LABEL,
  pauseJob,
  resumeJob,
  runJob,
  updateJob,
  type JobItem,
  type JobStatus,
  type JobWritePayload
} from './api'

const columnLabels: Record<string, string> = {
  jobClassName: '任务类名',
  cronExpression: '执行表达式',
  status: '状态',
  lastRun: '上次执行',
  nextRun: '下次执行',
  lastResult: '上次结果',
  description: '描述'
}

export function JobPage() {
  const [list, setList] = useState<JobItem[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | `${JobStatus}`>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<JobItem | null>(null)
  const [deleting, setDeleting] = useState<JobItem | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchJobs()
      .then(res => {
        setList(res.records ?? [])
        setTotal(res.total ?? 0)
      })
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const running = list.filter(job => job.status === 0).length

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (job: JobItem) => {
    setEditing(job)
    setFormOpen(true)
  }

  const handleToggle = (job: JobItem) => {
    setBusyId(job.id)
    const action = job.status === 0 ? pauseJob(job.id) : resumeJob(job.id)
    action
      .then(() => {
        toast.success(`${job.status === 0 ? '已暂停' : '已启动'}「${job.jobClassName}」`)
        load()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '操作失败'))
      .finally(() => setBusyId(null))
  }

  const handleRun = (job: JobItem) => {
    setBusyId(job.id)
    runJob(job.id)
      .then(result => {
        if (result.success) {
          toast.success(`「${job.jobClassName}」执行成功：${result.message}（${result.duration}ms）`)
        } else {
          toast.error(`「${job.jobClassName}」执行失败：${result.message}`)
        }
        load()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '执行失败'))
      .finally(() => setBusyId(null))
  }

  const columns = useMemo<ColumnDef<JobItem>[]>(
    () => [
      {
        accessorKey: 'jobClassName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="任务类名" />,
        cell: ({ row }) => <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-medium">{row.original.jobClassName}</code>
      },
      {
        accessorKey: 'cronExpression',
        header: '执行表达式',
        cell: ({ row }) => <code className="bg-muted rounded px-1.5 py-0.5 text-xs">{row.original.cronExpression}</code>
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="状态" />,
        cell: ({ row }) => <StatusBadge ok={row.original.status === 0} label={JOB_STATUS_LABEL[row.original.status] ?? String(row.original.status)} />,
        filterFn: (row, id, value) => String(row.getValue(id)) === value
      },
      {
        accessorKey: 'lastRun',
        header: ({ column }) => <DataTableColumnHeader column={column} title="上次执行" />,
        cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{formatDateTime(row.original.lastRun)}</span>
      },
      {
        accessorKey: 'nextRun',
        header: ({ column }) => <DataTableColumnHeader column={column} title="下次执行" />,
        cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{formatDateTime(row.original.nextRun)}</span>
      },
      {
        accessorKey: 'lastResult',
        header: '上次结果',
        enableSorting: false,
        cell: ({ row }) => {
          const { lastResult, lastSuccess, lastDuration } = row.original
          if (!lastResult) return <span className="text-muted-foreground">-</span>
          return (
            <span
              className={lastSuccess ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}
              title={lastDuration !== undefined ? `耗时 ${lastDuration}ms` : undefined}
            >
              {lastResult}
            </span>
          )
        }
      },
      {
        accessorKey: 'description',
        header: '描述',
        enableSorting: false,
        cell: ({ row }) => <span className="text-muted-foreground line-clamp-1 max-w-56">{row.original.description || '-'}</span>
      },
      {
        id: 'actions',
        header: () => <div className="text-end">操作</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const job = row.original
          const busy = busyId === job.id
          return (
            <div className="flex items-center justify-end gap-0.5">
              {hasPermission('system:job:run') && (
                <Button variant="ghost" size="icon" disabled={busy} onClick={() => handleRun(job)}>
                  <Play className="size-4" />
                  <span className="sr-only">执行一次</span>
                </Button>
              )}
              {hasPermission('system:job:update') && (
                <Button variant="ghost" size="icon" disabled={busy} onClick={() => handleToggle(job)}>
                  {job.status === 0 ? <CirclePause className="size-4" /> : <CirclePlay className="size-4 text-emerald-600" />}
                  <span className="sr-only">{job.status === 0 ? '暂停' : '启动'}</span>
                </Button>
              )}
              {hasPermission('system:job:update') && (
                <Button variant="ghost" size="icon" onClick={() => openEdit(job)}>
                  <Pencil className="size-4" />
                  <span className="sr-only">编辑</span>
                </Button>
              )}
              {hasPermission('system:job:delete') && (
                <Button variant="ghost" size="icon" onClick={() => setDeleting(job)}>
                  <Trash2 className="text-destructive size-4" />
                  <span className="sr-only">删除</span>
                </Button>
              )}
            </div>
          )
        }
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- busyId 变化时重建列以刷新按钮禁用态
    [busyId]
  )

  const columnFilters = useMemo(() => (statusFilter === 'all' ? [] : [{ id: 'status', value: statusFilter }]), [statusFilter])

  const { table, keyword, setKeyword } = useDataTable({ data: list, columns, columnFilters })

  const handleSubmit = async (values: JobWritePayload) => {
    if (editing) {
      await updateJob(editing.id, values)
      toast.success('定时任务已更新')
    } else {
      await createJob(values)
      toast.success(values.status === 0 ? '定时任务已创建并启动' : '定时任务已创建（暂停状态）')
    }
    setFormOpen(false)
    load()
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteJob(deleting.id)
      toast.success(`已删除任务「${deleting.jobClassName}」`)
      setDeleting(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">定时任务</h1>
          <p className="text-muted-foreground text-sm">
            共 {total} 个任务，{running} 个运行中
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load}>
            <RefreshCw />
            刷新
          </Button>
          {hasPermission('system:job:add') && (
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
                <Input placeholder="搜索任务类名 / 描述" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
              <Select
                value={statusFilter}
                onValueChange={v => setStatusFilter(v as 'all' | `${JobStatus}`)}
                items={{ all: '全部状态', '0': '运行中', '-1': '已暂停' }}
              >
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="0">运行中</SelectItem>
                  <SelectItem value="-1">已暂停</SelectItem>
                </SelectContent>
              </Select>
              <DataTableViewOptions table={table} columnLabels={columnLabels} />
            </div>

            <DataTable table={table} emptyText="没有匹配的任务" />
            <DataTablePagination table={table} />
          </CardContent>
        </Card>
      )}

      {formOpen && <JobFormDialog key={editing?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} job={editing} onSubmit={handleSubmit} />}

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除任务「{deleting?.jobClassName}」（逻辑删除并停止调度）。</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}
