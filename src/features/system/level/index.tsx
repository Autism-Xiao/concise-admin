import { useEffect, useMemo, useState } from 'react'
import { Download, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ExcelImportDialog } from '@/components/excel-import-dialog'
import { StatusBadge } from '@/components/status-badge'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useDataTable } from '@/components/data-table'
import { hasPermission } from '@/lib/auth'
import { toastBatchResult } from '@/lib/batch-delete'
import { saveBlobFile } from '@/lib/download'
import { LevelFormDialog } from './components/level-form-dialog'
import { createLevel, deleteLevel, deleteLevels, downloadLevelTemplate, exportLevels, fetchLevels, importLevels, updateLevel, type Level, type LevelWritePayload } from './api'
import { withOperationLog } from '@/features/system/log/api'

const columnLabels: Record<string, string> = {
  levelName: '职级名称',
  levelRank: '等级排序',
  status: '状态',
  remark: '备注'
}

export function LevelPage() {
  const [list, setList] = useState<Level[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Level | null>(null)
  const [deleting, setDeleting] = useState<Level | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [batchBusy, setBatchBusy] = useState(false)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchLevels()
      .then(setList)
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const levels = useMemo(() => list ?? [], [list])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (level: Level) => {
    setEditing(level)
    setFormOpen(true)
  }

  const columns = useMemo<ColumnDef<Level>[]>(
    () => [
      {
        accessorKey: 'levelName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="职级名称" />,
        cell: ({ row }) => <span className="font-medium">{row.getValue('levelName')}</span>
      },
      {
        accessorKey: 'levelRank',
        header: ({ column }) => <DataTableColumnHeader column={column} title="等级排序" />,
        cell: ({ row }) => <span className="tabular-nums">{row.getValue('levelRank')}</span>
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="状态" />,
        cell: ({ row }) => {
          const status = row.getValue<string>('status')
          return <StatusBadge ok={status === '1'} label={status === '1' ? '正常' : '停用'} />
        },
        filterFn: (row, id, value) => row.getValue(id) === value
      },
      {
        accessorKey: 'remark',
        header: '备注',
        enableSorting: false,
        cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('remark') || '-'}</span>
      },
      {
        id: 'actions',
        header: () => <div className="text-end">操作</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="text-end">
            {hasPermission('system:level:update') && (
              <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}>
                <Pencil className="size-4" />
                <span className="sr-only">编辑</span>
              </Button>
            )}
            {hasPermission('system:level:delete') && (
              <Button variant="ghost" size="icon" onClick={() => setDeleting(row.original)}>
                <Trash2 className="text-destructive size-4" />
                <span className="sr-only">删除</span>
              </Button>
            )}
          </div>
        )
      }
    ],
    []
  )

  const columnFilters = useMemo(() => (statusFilter === 'all' ? [] : [{ id: 'status', value: statusFilter }]), [statusFilter])
  const { table, keyword, setKeyword, rowSelection, setRowSelection } = useDataTable({
    data: levels,
    columns,
    columnFilters,
    getRowId: level => level.id
  })
  const selectedCount = Object.keys(rowSelection).filter(key => rowSelection[key]).length

  const handleBatchDelete = async () => {
    const targets = table.getSelectedRowModel().rows.map(row => row.original)
    if (!targets.length || batchBusy) return
    setBatchBusy(true)
    try {
      const result = await withOperationLog(`批量删除 ${targets.length} 个职级`, () => deleteLevels(targets.map(level => level.id)))
      toastBatchResult(result, '职级')
      setBatchDeleting(false)
      setRowSelection({})
      load()
    } finally {
      setBatchBusy(false)
    }
  }

  const handleSubmit = (values: LevelWritePayload) => {
    const request = editing ? withOperationLog('更新职级', () => updateLevel(editing.id, values)) : withOperationLog('新增职级', () => createLevel(values))
    request
      .then(() => {
        toast.success(editing ? '职级已更新' : '职级已创建')
        setFormOpen(false)
        load()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '保存失败'))
  }

  /** 导出：把当前搜索关键字带给后端，导出的是筛选后的结果 */
  const handleExport = () => {
    setExporting(true)
    exportLevels({ keyword: keyword.trim() })
      .then(({ filename, blob }) => {
        saveBlobFile(filename, blob)
        toast.success('职级已导出')
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '导出失败'))
      .finally(() => setExporting(false))
  }

  const handleDelete = () => {
    if (!deleting) return
    withOperationLog(`删除职级「${deleting.levelName}」`, () => deleteLevel(deleting.id))
      .then(() => {
        toast.success(`已删除职级「${deleting.levelName}」`)
        load()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '删除失败'))
    setDeleting(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">职级管理</h1>
          <p className="text-muted-foreground text-sm">共 {levels.length} 个职级，按等级从高到低排列</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPermission('system:level:export') && (
            <Button variant="outline" onClick={handleExport} disabled={exporting || levels.length === 0}>
              <Download />
              {exporting ? '导出中…' : '导出'}
            </Button>
          )}
          {hasPermission('system:level:import') && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload />
              导入
            </Button>
          )}
          {hasPermission('system:level:delete') && selectedCount > 0 && (
            <Button variant="outline" onClick={() => setBatchDeleting(true)} disabled={batchBusy}>
              <Trash2 />
              批量删除（{selectedCount}）
            </Button>
          )}
          {hasPermission('system:level:add') && (
            <Button onClick={openCreate}>
              <Plus />
              新增职级
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
                <Input placeholder="搜索名称 / 备注" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter} items={{ all: '全部状态', 1: '正常', 0: '停用' }}>
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="1">正常</SelectItem>
                  <SelectItem value="0">停用</SelectItem>
                </SelectContent>
              </Select>
              <DataTableViewOptions table={table} columnLabels={columnLabels} />
            </div>

            <DataTable table={table} emptyText="没有匹配的职级" />
            <DataTablePagination table={table} />
          </CardContent>
        </Card>
      )}

      {formOpen && <LevelFormDialog key={editing?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} level={editing} onSubmit={handleSubmit} />}

      {importOpen && (
        <ExcelImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          title="导入职级"
          description="按「职级名称」判定：不存在则新增，已存在则更新填写了的等级、状态与备注。单次最多 2000 行。"
          templateHint="模板含填写说明与示例，必填列带 *"
          onImported={load}
          downloadTemplate={downloadLevelTemplate}
          importFile={importLevels}
        />
      )}

      <ConfirmDialog
        confirmText="删除"
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除职级「{deleting?.levelName}」，该操作为硬删除，不可恢复。</>}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        confirmText="删除"
        open={batchDeleting}
        onOpenChange={v => !batchBusy && setBatchDeleting(v)}
        title="批量删除职级"
        description={
          <>
            即将删除勾选的 {selectedCount} 个职级，该操作为硬删除，不可恢复。{batchBusy ? '正在删除，请稍候…' : ''}
          </>
        }
        onConfirm={handleBatchDelete}
      />
    </div>
  )
}
