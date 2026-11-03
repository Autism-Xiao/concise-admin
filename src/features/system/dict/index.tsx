import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
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
import { DictFormDialog } from './components/dict-form-dialog'
import { fetchDicts, saveDicts, type Dict } from './api'
import { withOperationLog } from '@/features/system/log/api'

const columnLabels: Record<string, string> = {
  id: 'ID',
  name: '字典名称',
  type: '字典类型',
  status: '状态',
  remark: '备注'
}

export function DictPage() {
  const [list, setList] = useState<Dict[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Dict | null>(null)
  const [deleting, setDeleting] = useState<Dict | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchDicts()
      .then(setList)
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const dicts = useMemo(() => list ?? [], [list])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (dict: Dict) => {
    setEditing(dict)
    setFormOpen(true)
  }

  const columns = useMemo<ColumnDef<Dict>[]>(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="字典名称" />,
        cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>
      },
      {
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="字典类型" />,
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue('type')}</span>
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="状态" />,
        cell: ({ row }) => {
          const status = row.getValue<Dict['status']>('status')
          return <StatusBadge ok={status === '正常'} label={status} />
        },
        filterFn: (row, id, value) => row.getValue(id) === value
      },
      {
        accessorKey: 'remark',
        header: '备注',
        enableSorting: false,
        cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('remark')}</span>
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
  const { table, keyword, setKeyword } = useDataTable({ data: dicts, columns, columnFilters })

  const handleSubmit = (values: Omit<Dict, 'id'>) => {
    if (editing) {
      persist(
        dicts.map(d => (d.id === editing.id ? { ...d, ...values } : d)),
        '字典已更新'
      )
    } else {
      const id = dicts.length ? Math.max(...dicts.map(d => d.id)) + 1 : 1
      persist([{ ...values, id }, ...dicts], '字典已创建')
    }
    setFormOpen(false)
  }

  const handleDelete = () => {
    if (!deleting) return
    persist(
      dicts.filter(d => d.id !== deleting.id),
      `已删除字典「${deleting.name}」`
    )
    setDeleting(null)
  }

  /** 乐观更新 + 写回 dicts.json，失败回退重新加载；操作记入操作日志 */
  const persist = (next: Dict[], successMsg: string) => {
    setList(next)
    withOperationLog(successMsg, () => saveDicts(next))
      .then(() => toast.success(successMsg))
      .catch(() => {
        toast.error('写入 dicts.json 失败，已重新加载')
        load()
      })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">字典管理</h1>
          <p className="text-muted-foreground text-sm">共 {dicts.length} 个字典（mock 数据）</p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          新增字典
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
                <Input placeholder="搜索名称 / 类型" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter} items={{ all: '全部状态', 正常: '正常', 停用: '停用' }}>
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="正常">正常</SelectItem>
                  <SelectItem value="停用">停用</SelectItem>
                </SelectContent>
              </Select>
              <DataTableViewOptions table={table} columnLabels={columnLabels} />
            </div>

            <DataTable table={table} emptyText="没有匹配的字典" />
            <DataTablePagination table={table} />
          </CardContent>
        </Card>
      )}

      {formOpen && <DictFormDialog key={editing?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} dict={editing} onSubmit={handleSubmit} />}

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除字典「{deleting?.name}」，该操作不可恢复。</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}
