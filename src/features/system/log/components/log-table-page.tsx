import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { PageResult } from '@/lib/http'
import { Download, Eraser, Search, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { RefreshButton } from '@/components/ui/refresh-button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { hasPermission } from '@/lib/auth'
import { saveBlobFile } from '@/lib/download'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ExcelImportDialog } from '@/components/excel-import-dialog'
import { StatusBadge } from '@/components/status-badge'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useServerTable, type ServerTableQuery } from '@/components/data-table'
import { deleteLogs, downloadLogTemplate, exportLogs, importLogs, type LogKind, type LogQuery, type LogStatus } from '../api'

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
  /** 加载数据（真实后端，服务端分页/搜索/排序） */
  fetcher: (query: LogQuery) => Promise<PageResult<T>>
  /** 端点类型：login 登录日志 / oper 操作日志（导出、导入、删除、模板共用） */
  deleteKind: LogKind
  /** 插入在「用户」和「IP 地址」之间的业务列 */
  extraColumns: ColumnDef<T>[]
  /** 额外列的列显示名（用于列显示开关） */
  extraColumnLabels: Record<string, string>
  /** 导入弹窗的判定规则说明 */
  importDescription: ReactNode
  /** 导入弹窗的表头提示 */
  importHint?: ReactNode
}

const baseColumnLabels: Record<string, string> = {
  id: 'ID',
  user: '用户',
  ip: 'IP 地址',
  time: '时间',
  status: '状态'
}

/** 日志页通用骨架：搜索 + 状态筛选 + 表格 + 单条删除/清空 + 导入导出（真实后端） */
export function LogTablePage<T extends BaseLog>({
  title,
  searchPlaceholder,
  fetcher,
  deleteKind,
  extraColumns,
  extraColumnLabels,
  importDescription,
  importHint
}: LogTablePageProps<T>) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleting, setDeleting] = useState<T | null>(null)
  const [clearing, setClearing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  /** 服务端查询：搜索/状态/排序/翻页都由接口完成（日志量大，本地拉全量会拖死浏览器） */
  const fetchPage = useCallback(
    ({ page, pageSize, keyword, filters, sortBy, sortOrder }: ServerTableQuery<{ status: string }>) =>
      fetcher({
        page,
        pageSize,
        keyword,
        status: filters.status === 'all' ? undefined : (filters.status as LogStatus),
        sortBy,
        sortOrder
      }),
    [fetcher]
  )

  const tableFilters = useMemo(() => ({ status: statusFilter }), [statusFilter])

  const removeIds = (ids: string[]) =>
    deleteLogs(deleteKind, ids)
      .then(() => {
        toast.success(`已删除 ${ids.length} 条日志`)
        reload()
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

  const { table, keyword, setKeyword, loading, booted, error, total, reload } = useServerTable({
    columns,
    query: fetchPage,
    filters: tableFilters,
    pageSize: 20,
    getRowId: log => log.id
  })
  /** 当前页行（「清空」作用范围就是这一页，文案里写明） */
  const pageLogs = table.getRowModel().rows.map(row => row.original)

  const handleDelete = () => {
    if (!deleting) return
    removeIds([deleting.id])
    setDeleting(null)
  }

  const handleClear = () => {
    // 只清当前页：全量清空要按筛选条件批量删，接口暂不支持「无 ids 清空」，不在这里假装做到
    removeIds(pageLogs.map(l => l.id))
    setClearing(false)
  }

  /** 导出 Excel：把当前搜索关键字与状态筛选带给后端，导出筛选后的结果（不筛选即全量） */
  const handleExport = () => {
    setExporting(true)
    exportLogs(deleteKind, {
      keyword: keyword.trim(),
      status: statusFilter === 'all' ? undefined : (statusFilter as LogStatus)
    })
      .then(({ filename, blob }) => {
        saveBlobFile(filename, blob)
        toast.success('日志已导出')
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '导出失败'))
      .finally(() => setExporting(false))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground text-sm">
            共 {total >= 0 ? total : 0} 条日志（每页 {table.getState().pagination.pageSize} 条）
          </p>
        </div>
        <div className="flex flex-wrap gap-2">

          {hasPermission('system:log:export') && (
            <Button variant="outline" onClick={handleExport} disabled={exporting || pageLogs.length === 0}>
              <Download />
              {exporting ? '导出中…' : '导出'}
            </Button>
          )}
          {hasPermission('system:log:import') && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload />
              导入
            </Button>
          )}
          {hasPermission('system:log:delete') && (
            <Button variant="outline" onClick={() => setClearing(true)} disabled={pageLogs.length === 0}>
              <Eraser />
              清空日志
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
              <RefreshButton onClick={() => void reload()} />
              <DataTableViewOptions table={table} columnLabels={{ ...baseColumnLabels, ...extraColumnLabels }} />
            </div>

            <DataTable table={table} loading={loading} emptyText="没有匹配的日志" />
            <DataTablePagination table={table} />
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        confirmText="删除"
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除日志 #{deleting?.id}，该操作不可恢复。</>}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        confirmText="清空"
        open={clearing}
        onOpenChange={setClearing}
        title="确认清空"
        description={<>即将删除当前页的 {pageLogs.length} 条日志，该操作不可恢复。</>}
        onConfirm={handleClear}
      />

      {importOpen && (
        <ExcelImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          title={`导入${title}`}
          description={importDescription}
          templateHint={importHint ?? '模板含填写说明与示例，必填列带 *'}
          onImported={reload}
          downloadTemplate={() => downloadLogTemplate(deleteKind)}
          importFile={file => importLogs(deleteKind, file)}
        />
      )}
    </div>
  )
}
