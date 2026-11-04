import { useEffect, useMemo, useState } from 'react'
import { Eraser, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { hasPermission } from '@/lib/auth'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { StatusBadge } from '@/components/status-badge'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useDataTable } from '@/components/data-table'
import { deleteLogs, type LogStatus } from '../api'

interface BaseLog {
  id: string
  user: string
  ip: string
  time: string
  status: LogStatus
}

interface LogTablePageProps<T extends BaseLog> {
  title: string
  searchPlaceholder: string
  /** 加载数据（真实后端） */
  fetcher: () => Promise<T[]>
  /** 删除端点类型：login 登录日志 / oper 操作日志 */
  deleteKind: 'login' | 'oper'
  /** 插入在「用户」和「IP 地址」之间的业务列 */
  extraColumns: ColumnDef<T>[]
  /** 额外列的列显示名（用于列显示开关） */
  extraColumnLabels: Record<string, string>
}

const baseColumnLabels: Record<string, string> = {
  id: 'ID',
  user: '用户',
  ip: 'IP 地址',
  time: '时间',
  status: '状态'
}

/** 日志页通用骨架：搜索 + 状态筛选 + 表格 + 单条删除/清空（真实后端批量删除接口） */
export function LogTablePage<T extends BaseLog>({ title, searchPlaceholder, fetcher, deleteKind, extraColumns, extraColumnLabels }: LogTablePageProps<T>) {
  const [list, setList] = useState<T[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleting, setDeleting] = useState<T | null>(null)
  const [clearing, setClearing] = useState(false)

  const load = () => {
    setLoading(true)
    setError(null)
    fetcher()
      .then(setList)
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [fetcher])

  const logs = useMemo(() => list ?? [], [list])

  const removeIds = (ids: string[]) =>
    deleteLogs(deleteKind, ids)
      .then(() => {
        toast.success(`已删除 ${ids.length} 条日志`)
        load()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '删除失败'))

  const columns = useMemo<ColumnDef<T>[]>(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />
      },
      {
        accessorKey: 'user',
        header: ({ column }) => <DataTableColumnHeader column={column} title="用户" />,
        cell: ({ row }) => <span className="font-medium">{row.getValue('user')}</span>
      },
      ...extraColumns,
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
        cell: ({ row }) => <StatusBadge ok={row.getValue<LogStatus>('status') === '成功'} label={row.getValue('status')} />,
        filterFn: (row, id, value) => row.getValue(id) === value
      },
      {
        id: 'actions',
        header: () => <div className="text-end">操作</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="text-end">
            {hasPermission('system:log:delete') && (
              <Button variant="ghost" size="icon" onClick={() => setDeleting(row.original)}>
                <Trash2 className="text-destructive size-4" />
                <span className="sr-only">删除</span>
              </Button>
            )}
          </div>
        )
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- extraColumns 由调用方模块级常量保证稳定
    []
  )

  const columnFilters = useMemo(() => (statusFilter === 'all' ? [] : [{ id: 'status', value: statusFilter }]), [statusFilter])
  const { table, keyword, setKeyword } = useDataTable({ data: logs, columns, columnFilters })

  const handleDelete = () => {
    if (!deleting) return
    removeIds([deleting.id])
    setDeleting(null)
  }

  const handleClear = () => {
    removeIds(logs.map(l => l.id))
    setClearing(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground text-sm">共 {logs.length} 条日志（已加载最近 {logs.length} 条）</p>
        </div>
        {hasPermission('system:log:delete') && (
          <Button variant="outline" onClick={() => setClearing(true)} disabled={logs.length === 0}>
            <Eraser />
            清空日志
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
                <Input placeholder={searchPlaceholder} className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
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
              <DataTableViewOptions table={table} columnLabels={{ ...baseColumnLabels, ...extraColumnLabels }} />
            </div>

            <DataTable table={table} emptyText="没有匹配的日志" />
            <DataTablePagination table={table} />
          </CardContent>
        </Card>
      )}

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
        description={<>即将清空全部 {logs.length} 条日志，该操作不可恢复。</>}
        onConfirm={handleClear}
      />
    </div>
  )
}
