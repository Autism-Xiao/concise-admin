import { useEffect, useMemo, useState } from 'react'
import { BellRing, Megaphone, Pencil, Plus, Search, Trash2 } from 'lucide-react'
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
import { NoticeFormDialog } from './components/notice-form-dialog'
import { fetchNotices, saveNotices, type Notice } from './api'
import { getUsername } from '@/lib/auth'
import { withOperationLog } from '@/features/system/log/api'

const columnLabels: Record<string, string> = {
  id: 'ID',
  title: '标题',
  type: '类型',
  status: '状态',
  publisher: '发布人',
  publishAt: '发布时间',
  content: '内容'
}

const statusOk: Record<Notice['status'], boolean> = { 已发布: true, 草稿: false, 已关闭: false }

export function NoticePage() {
  const [list, setList] = useState<Notice[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Notice | null>(null)
  const [deleting, setDeleting] = useState<Notice | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchNotices()
      .then(setList)
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const notices = useMemo(() => list ?? [], [list])

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
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />
      },
      {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title="标题" />,
        cell: ({ row }) => {
          const Icon = row.original.type === '公告' ? Megaphone : BellRing
          return (
            <span className="flex items-center gap-2 font-medium">
              <Icon className="text-muted-foreground size-4 shrink-0" />
              {row.getValue('title')}
            </span>
          )
        }
      },
      {
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="类型" />
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="状态" />,
        cell: ({ row }) => {
          const status = row.getValue<Notice['status']>('status')
          return <StatusBadge ok={statusOk[status]} label={status} />
        },
        filterFn: (row, id, value) => row.getValue(id) === value
      },
      {
        accessorKey: 'publisher',
        header: ({ column }) => <DataTableColumnHeader column={column} title="发布人" />
      },
      {
        accessorKey: 'publishAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="发布时间" />,
        cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{row.getValue('publishAt') || '-'}</span>
      },
      {
        accessorKey: 'content',
        header: '内容',
        enableSorting: false,
        cell: ({ row }) => <span className="text-muted-foreground line-clamp-1 max-w-64">{row.getValue('content')}</span>
      },
      {
        id: 'actions',
        header: () => <div className="text-end">操作</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="text-end">
            <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}>
              <Pencil className="size-4" />
              <span className="sr-only">编辑</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleting(row.original)}>
              <Trash2 className="text-destructive size-4" />
              <span className="sr-only">删除</span>
            </Button>
          </div>
        )
      }
    ],
    []
  )

  const columnFilters = useMemo(() => (statusFilter === 'all' ? [] : [{ id: 'status', value: statusFilter }]), [statusFilter])
  const { table, keyword, setKeyword } = useDataTable({ data: notices, columns, columnFilters })

  const handleSubmit = (values: Omit<Notice, 'id' | 'publisher' | 'publishAt'>) => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    // 草稿清空发布时间；首次发布记录当前时间
    const resolvePublishAt = (prev: string) => (values.status === '草稿' ? '' : prev || now)
    if (editing) {
      persist(
        notices.map(n => (n.id === editing.id ? { ...n, ...values, publishAt: resolvePublishAt(n.publishAt) } : n)),
        '公告已更新'
      )
    } else {
      const id = notices.length ? Math.max(...notices.map(n => n.id)) + 1 : 1
      persist([{ ...values, id, publisher: getUsername() || 'admin', publishAt: resolvePublishAt('') }, ...notices], '公告已创建')
    }
    setFormOpen(false)
  }

  const handleDelete = () => {
    if (!deleting) return
    persist(
      notices.filter(n => n.id !== deleting.id),
      `已删除公告「${deleting.title}」`
    )
    setDeleting(null)
  }

  /** 乐观更新 + 写回 notices.json，失败回退重新加载；操作记入操作日志 */
  const persist = (next: Notice[], successMsg: string) => {
    setList(next)
    withOperationLog(successMsg, () => saveNotices(next))
      .then(() => toast.success(successMsg))
      .catch(() => {
        toast.error('写入 notices.json 失败，已重新加载')
        load()
      })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">通知公告</h1>
          <p className="text-muted-foreground text-sm">共 {notices.length} 条（mock 数据）</p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          新增公告
        </Button>
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
              <Select value={statusFilter} onValueChange={setStatusFilter} items={{ all: '全部状态', 已发布: '已发布', 草稿: '草稿', 已关闭: '已关闭' }}>
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="已发布">已发布</SelectItem>
                  <SelectItem value="草稿">草稿</SelectItem>
                  <SelectItem value="已关闭">已关闭</SelectItem>
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
