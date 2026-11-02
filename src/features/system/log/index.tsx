import { useMemo, useState } from 'react'
import { Eraser, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { StatusBadge } from '@/components/status-badge'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useDataTable } from '@/components/data-table'
import { logs as mockLogs, type LogEntry } from './data/logs'

const columnLabels: Record<string, string> = {
  id: 'ID',
  user: '操作人',
  action: '操作类型',
  ip: 'IP 地址',
  time: '时间',
  status: '状态'
}

/** 日志只读：支持搜索、筛选、单条删除与清空，不提供新增/编辑 */
export function LogPage() {
  const [list, setList] = useState<LogEntry[]>(mockLogs)
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleting, setDeleting] = useState<LogEntry | null>(null)
  const [clearing, setClearing] = useState(false)

  const columns = useMemo<ColumnDef<LogEntry>[]>(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />
      },
      {
        accessorKey: 'user',
        header: ({ column }) => <DataTableColumnHeader column={column} title="操作人" />,
        cell: ({ row }) => <span className="font-medium">{row.getValue('user')}</span>
      },
      {
        accessorKey: 'action',
        header: ({ column }) => <DataTableColumnHeader column={column} title="操作类型" />
      },
      {
        accessorKey: 'ip',
        header: 'IP 地址',
        enableSorting: false,
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue('ip')}</span>
      },
      {
        accessorKey: 'time',
        header: ({ column }) => <DataTableColumnHeader column={column} title="时间" />,
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue('time')}</span>
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="状态" />,
        cell: ({ row }) => {
          const status = row.getValue<LogEntry['status']>('status')
          return <StatusBadge ok={status === '成功'} label={status} />
        },
        filterFn: (row, id, value) => row.getValue(id) === value
      },
      {
        id: 'actions',
        header: () => <div className="text-end">操作</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="text-end">
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
  const { table, keyword, setKeyword } = useDataTable({ data: list, columns, columnFilters })

  const handleDelete = () => {
    if (!deleting) return
    setList(prev => prev.filter(l => l.id !== deleting.id))
    toast.success(`已删除日志 #${deleting.id}`)
    setDeleting(null)
  }

  const handleClear = () => {
    setList([])
    toast.success('已清空全部日志')
    setClearing(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">日志管理</h1>
          <p className="text-muted-foreground text-sm">共 {list.length} 条日志（mock 数据）</p>
        </div>
        <Button variant="outline" onClick={() => setClearing(true)} disabled={list.length === 0}>
          <Eraser />
          清空日志
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
              <Input placeholder="搜索操作人 / 类型 / IP" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter} items={{ all: '全部状态', 成功: '成功', 失败: '失败' }}>
              <SelectTrigger className="h-9 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="成功">成功</SelectItem>
                <SelectItem value="失败">失败</SelectItem>
              </SelectContent>
            </Select>
            <DataTableViewOptions table={table} columnLabels={columnLabels} />
          </div>

          <DataTable table={table} emptyText="没有匹配的日志" />
          <DataTablePagination table={table} />
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除日志 #{deleting?.id}，该操作不可恢复。</>}
        onConfirm={handleDelete}
      />

      <ConfirmDeleteDialog
        open={clearing}
        onOpenChange={setClearing}
        title="确认清空"
        description={<>即将清空全部 {list.length} 条日志，该操作不可恢复。</>}
        onConfirm={handleClear}
      />
    </div>
  )
}
