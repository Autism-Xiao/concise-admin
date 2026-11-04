import { useEffect, useMemo, useState } from 'react'
import { BellRing, Megaphone, Pencil, Plus, Search, Send, Trash2, Undo2 } from 'lucide-react'
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
import { NoticeFormDialog } from './components/notice-form-dialog'
import {
  NOTICE_CATEGORY_LABEL,
  NOTICE_PRIORITY_LABEL,
  NOTICE_STATUS_LABEL,
  deleteNotice,
  fetchNotices,
  formatDateTime,
  publishNotice,
  revokeNotice,
  updateNotice,
  createNotice,
  type Notice,
  type NoticeCategory,
  type NoticePriority,
  type NoticeSendStatus,
  type NoticeWritePayload
} from './api'

const columnLabels: Record<string, string> = {
  title: '标题',
  msgCategory: '类型',
  priority: '优先级',
  sendStatus: '状态',
  sender: '发布人',
  sendTime: '发布时间',
  msgContent: '内容'
}

const statusOk: Record<NoticeSendStatus, boolean> = { '1': true, '0': false, '2': false }

const priorityClass: Record<NoticePriority, string> = {
  H: 'bg-destructive/15 text-destructive',
  M: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  L: 'bg-muted text-muted-foreground'
}

export function NoticePage() {
  const [list, setList] = useState<Notice[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | NoticeSendStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | NoticeCategory>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Notice | null>(null)
  const [deleting, setDeleting] = useState<Notice | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchNotices({ pageSize: 100 })
      .then(res => {
        setList(res.items ?? [])
        setTotal(res.total ?? 0)
      })
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (notice: Notice) => {
    setEditing(notice)
    setFormOpen(true)
  }

  const columns = useMemo<ColumnDef<Notice>[]>(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title="标题" />,
        cell: ({ row }) => {
          const Icon = row.original.msgCategory === '2' ? Megaphone : BellRing
          return (
            <span className="flex items-center gap-2 font-medium">
              <Icon className="text-muted-foreground size-4 shrink-0" />
              {row.getValue('title')}
            </span>
          )
        }
      },
      {
        accessorKey: 'msgCategory',
        header: ({ column }) => <DataTableColumnHeader column={column} title="类型" />,
        cell: ({ row }) => NOTICE_CATEGORY_LABEL[row.original.msgCategory] ?? '-',
        filterFn: (row, id, value) => row.getValue(id) === value
      },
      {
        accessorKey: 'priority',
        header: ({ column }) => <DataTableColumnHeader column={column} title="优先级" />,
        cell: ({ row }) => {
          const priority = row.original.priority
          if (!priority) return '-'
          return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${priorityClass[priority]}`}>{NOTICE_PRIORITY_LABEL[priority]}</span>
        },
        filterFn: (row, id, value) => row.getValue(id) === value
      },
      {
        accessorKey: 'sendStatus',
        header: ({ column }) => <DataTableColumnHeader column={column} title="状态" />,
        cell: ({ row }) => {
          const status = row.original.sendStatus
          return <StatusBadge ok={statusOk[status]} label={NOTICE_STATUS_LABEL[status] ?? status} />
        },
        filterFn: (row, id, value) => row.getValue(id) === value
      },
      {
        accessorKey: 'sender',
        header: ({ column }) => <DataTableColumnHeader column={column} title="发布人" />,
        cell: ({ row }) => row.original.sender || '-'
      },
      {
        accessorKey: 'sendTime',
        header: ({ column }) => <DataTableColumnHeader column={column} title="发布时间" />,
        cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{formatDateTime(row.original.sendTime)}</span>
      },
      {
        accessorKey: 'msgContent',
        header: '内容',
        enableSorting: false,
        cell: ({ row }) => <span className="text-muted-foreground line-clamp-1 max-w-64">{row.original.msgContent || '-'}</span>
      },
      {
        id: 'actions',
        header: () => <div className="text-end">操作</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const notice = row.original
          const busy = busyId === notice.id
          return (
            <div className="flex items-center justify-end gap-0.5">
              {hasPermission('system:notice:update') && (
                <Button variant="ghost" size="icon" onClick={() => openEdit(notice)}>
                  <Pencil className="size-4" />
                  <span className="sr-only">编辑</span>
                </Button>
              )}
              {hasPermission('system:notice:publish') &&
                (notice.sendStatus === '1' ? (
                  <Button variant="ghost" size="icon" disabled={busy} onClick={() => handleStatusChange(notice, 'revoke')}>
                    <Undo2 className="size-4" />
                    <span className="sr-only">撤销</span>
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" disabled={busy} onClick={() => handleStatusChange(notice, 'publish')}>
                    <Send className="text-emerald-600 size-4" />
                    <span className="sr-only">发布</span>
                  </Button>
                ))}
              {hasPermission('system:notice:delete') && (
                <Button variant="ghost" size="icon" onClick={() => setDeleting(notice)}>
                  <Trash2 className="text-destructive size-4" />
                  <span className="sr-only">删除</span>
                </Button>
              )}
            </div>
          )
        }
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleStatusChange/busyId 变化时重建列以刷新按钮禁用态
    [busyId]
  )

  const columnFilters = useMemo(() => {
    const filters: Array<{ id: string; value: string }> = []
    if (statusFilter !== 'all') filters.push({ id: 'sendStatus', value: statusFilter })
    if (categoryFilter !== 'all') filters.push({ id: 'msgCategory', value: categoryFilter })
    return filters
  }, [statusFilter, categoryFilter])

  const { table, keyword, setKeyword } = useDataTable({ data: list, columns, columnFilters })

  const handleSubmit = async (values: NoticeWritePayload) => {
    if (editing) {
      await updateNotice(editing.id, values)
      toast.success('公告已更新')
    } else {
      await createNotice(values)
      toast.success(values.sendStatus === '1' ? '公告已创建并发布' : '公告已保存为未发布')
    }
    setFormOpen(false)
    load()
  }

  const handleStatusChange = (notice: Notice, action: 'publish' | 'revoke') => {
    setBusyId(notice.id)
    const task = action === 'publish' ? publishNotice(notice.id) : revokeNotice(notice.id)
    task
      .then(() => {
        toast.success(action === 'publish' ? `已发布「${notice.title}」` : `已撤销「${notice.title}」`)
        load()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '操作失败'))
      .finally(() => setBusyId(null))
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteNotice(deleting.id)
      toast.success(`已删除公告「${deleting.title}」`)
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
          <h1 className="text-2xl font-bold">通知公告</h1>
          <p className="text-muted-foreground text-sm">
            共 {total} 条{total > list.length ? `（当前展示最近 ${list.length} 条）` : ''}
          </p>
        </div>
        {hasPermission('system:notice:add') && (
          <Button onClick={openCreate}>
            <Plus />
            新增公告
          </Button>
        )}
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
                <Input placeholder="搜索标题 / 内容" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
              <Select
                value={statusFilter}
                onValueChange={v => setStatusFilter(v as 'all' | NoticeSendStatus)}
                items={{ all: '全部状态', '1': '已发布', '0': '未发布', '2': '已撤销' }}
              >
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="1">已发布</SelectItem>
                  <SelectItem value="0">未发布</SelectItem>
                  <SelectItem value="2">已撤销</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={categoryFilter}
                onValueChange={v => setCategoryFilter(v as 'all' | NoticeCategory)}
                items={{ all: '全部类型', '1': '通知公告', '2': '系统消息' }}
              >
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="1">通知公告</SelectItem>
                  <SelectItem value="2">系统消息</SelectItem>
                </SelectContent>
              </Select>
              <DataTableViewOptions table={table} columnLabels={columnLabels} />
            </div>

            <DataTable table={table} emptyText="没有匹配的公告" />
            <DataTablePagination table={table} />
          </CardContent>
        </Card>
      )}

      {formOpen && <NoticeFormDialog key={editing?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} notice={editing} onSubmit={handleSubmit} />}

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除公告「{deleting?.title}」，该操作不可恢复。</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}
