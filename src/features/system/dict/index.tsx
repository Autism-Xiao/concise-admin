import { useEffect, useMemo, useState } from 'react'
import { Download, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { cn } from '@/lib/utils'
import { DictFormDialog } from './components/dict-form-dialog'
import { DictItemFormDialog } from './components/dict-item-form-dialog'
import {
  createDict,
  createDictItem,
  deleteDict,
  deleteDictItem,
  deleteDictItems,
  downloadDictTemplate,
  exportDicts,
  fetchDictItems,
  fetchDicts,
  importDicts,
  updateDict,
  updateDictItem,
  type Dict,
  type DictFormValues,
  type DictItem,
  type DictItemFormValues
} from './api'

const itemColumnLabels: Record<string, string> = {
  itemText: '字典项文本',
  itemValue: '字典项值',
  sortOrder: '排序',
  status: '状态',
  description: '描述'
}

/**
 * 数据字典页：左侧字典类型、右侧该字典下的字典项
 *
 * 数据来源 /backend-api/v1/dicts 与 /v1/dict-items（后端对齐 JeecgBoot sys_dict / sys_dict_item）。
 * 字典项一次取 200 条后走前端分页（字典项数量通常很小）。
 */
export function DictPage() {
  // ---- 左侧：字典类型 ----
  const [dicts, setDicts] = useState<Dict[]>([])
  const [dictKeyword, setDictKeyword] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loadingDicts, setLoadingDicts] = useState(true)
  const [dictError, setDictError] = useState<string | null>(null)

  // ---- 右侧：字典项 ----
  const [items, setItems] = useState<DictItem[]>([])
  const [itemStatus, setItemStatus] = useState('all')
  const [loadingItems, setLoadingItems] = useState(false)

  // ---- 弹窗 ----
  const [dictFormOpen, setDictFormOpen] = useState(false)
  const [editingDict, setEditingDict] = useState<Dict | null>(null)
  const [deletingDict, setDeletingDict] = useState<Dict | null>(null)

  const [itemFormOpen, setItemFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DictItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<DictItem | null>(null)

  // ---- 导入导出 / 批量删除 ----
  const [importOpen, setImportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [batchBusy, setBatchBusy] = useState(false)

  const loadDicts = (preferId?: string) => {
    setLoadingDicts(true)
    setDictError(null)
    fetchDicts()
      .then(list => {
        setDicts(list)
        setActiveId(prev => {
          const target = preferId ?? prev
          if (target && list.some(dict => dict.id === target)) return target
          return list[0]?.id ?? null
        })
      })
      .catch(error => setDictError(error instanceof Error ? error.message : '加载失败'))
      .finally(() => setLoadingDicts(false))
  }

  useEffect(() => {
    loadDicts()
  }, [])

  const loadItems = (dictId: string) => {
    setLoadingItems(true)
    fetchDictItems({ dictId })
      .then(rows => setItems(rows))
      .catch(error => toast.error(error instanceof Error ? error.message : '字典项加载失败'))
      .finally(() => setLoadingItems(false))
  }

  useEffect(() => {
    if (!activeId) {
      setItems([])
      return
    }
    loadItems(activeId)
  }, [activeId])

  const activeDict = useMemo(() => dicts.find(dict => dict.id === activeId) ?? null, [dicts, activeId])

  const filteredDicts = useMemo(() => {
    const keyword = dictKeyword.trim().toLowerCase()
    if (!keyword) return dicts
    return dicts.filter(dict => dict.dictName.toLowerCase().includes(keyword) || dict.dictCode.toLowerCase().includes(keyword))
  }, [dicts, dictKeyword])

  const columns = useMemo<ColumnDef<DictItem>[]>(
    () => [
      {
        accessorKey: 'itemText',
        header: ({ column }) => <DataTableColumnHeader column={column} title="字典项文本" />,
        cell: ({ row }) => <span className="font-medium">{row.getValue('itemText')}</span>
      },
      {
        accessorKey: 'itemValue',
        header: ({ column }) => <DataTableColumnHeader column={column} title="字典项值" />,
        cell: ({ row }) => <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{row.getValue('itemValue')}</code>
      },
      {
        accessorKey: 'sortOrder',
        header: ({ column }) => <DataTableColumnHeader column={column} title="排序" />,
        cell: ({ row }) => <span className="tabular-nums">{row.getValue('sortOrder') ?? 0}</span>
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="状态" />,
        cell: ({ row }) => {
          const status = row.getValue<number>('status')
          return <StatusBadge ok={status === 1} label={status === 1 ? '启用' : '不启用'} />
        },
        filterFn: (row, id, value) => String(row.getValue(id)) === value
      },
      {
        accessorKey: 'description',
        header: '描述',
        enableSorting: false,
        cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('description') || '-'}</span>
      },
      {
        id: 'actions',
        header: () => <div className="text-end">操作</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            {hasPermission('system:dict:update') && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingItem(row.original)
                  setItemFormOpen(true)
                }}
              >
                <Pencil className="size-4" />
                <span className="sr-only">编辑</span>
              </Button>
            )}
            {hasPermission('system:dict:delete') && (
              <Button variant="ghost" size="icon" onClick={() => setDeletingItem(row.original)}>
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

  const columnFilters = useMemo(() => (itemStatus === 'all' ? [] : [{ id: 'status', value: itemStatus }]), [itemStatus])
  const { table, keyword, setKeyword, rowSelection, setRowSelection } = useDataTable({ data: items, columns, columnFilters, getRowId: item => item.id })
  const selectedCount = Object.keys(rowSelection).filter(key => rowSelection[key]).length

  // ---- 字典 CRUD ----
  const handleDictSubmit = async (values: DictFormValues) => {
    try {
      if (editingDict) {
        await updateDict(editingDict.id, values)
        toast.success('字典已更新')
        loadDicts(editingDict.id)
      } else {
        const created = await createDict(values)
        toast.success(`字典「${created.dictName}」已创建`)
        loadDicts(created.id)
      }
      setDictFormOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    }
  }

  const handleDeleteDict = async () => {
    if (!deletingDict) return
    try {
      await deleteDict(deletingDict.id)
      toast.success(`已删除字典「${deletingDict.dictName}」`)
      setDeletingDict(null)
      loadDicts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  // ---- 字典项 CRUD ----
  const handleItemSubmit = async (values: DictItemFormValues) => {
    if (!activeDict) return
    try {
      if (editingItem) {
        await updateDictItem(editingItem.id, values)
        toast.success('字典项已更新')
      } else {
        await createDictItem(activeDict.id, values)
        toast.success('字典项已创建')
      }
      setItemFormOpen(false)
      loadItems(activeDict.id)
      loadDicts(activeDict.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    }
  }

  /** 导出：整包带走（字典类型 + 字典项），与导入模板列一致，改完可再导回 */
  const handleExport = () => {
    setExporting(true)
    exportDicts({ keyword: dictKeyword.trim() })
      .then(({ filename, blob }) => {
        saveBlobFile(filename, blob)
        toast.success('字典已导出')
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '导出失败'))
      .finally(() => setExporting(false))
  }

  /** 批量删除字典项：走后端统一接口，逐条结算 */
  const handleBatchDelete = async () => {
    const targets = table.getSelectedRowModel().rows.map(row => row.original)
    if (!targets.length || batchBusy) return
    setBatchBusy(true)
    try {
      const result = await deleteDictItems(targets.map(item => item.id))
      toastBatchResult(result, '字典项')
      setBatchDeleting(false)
      setRowSelection({})
      if (activeDict) {
        loadItems(activeDict.id)
        loadDicts(activeDict.id)
      }
    } finally {
      setBatchBusy(false)
    }
  }

  const handleDeleteItem = async () => {
    if (!deletingItem || !activeDict) return
    try {
      await deleteDictItem(deletingItem.id)
      toast.success(`已删除字典项「${deletingItem.itemText}」`)
      setDeletingItem(null)
      loadItems(activeDict.id)
      loadDicts(activeDict.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">数据字典</h1>
          <p className="text-muted-foreground text-sm">共 {dicts.length} 个字典 · 左侧选择字典，右侧维护其字典项</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPermission('system:dict:export') && (
            <Button variant="outline" onClick={handleExport} disabled={exporting || dicts.length === 0}>
              <Download />
              {exporting ? '导出中…' : '导出'}
            </Button>
          )}
          {hasPermission('system:dict:import') && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload />
              导入
            </Button>
          )}
          {hasPermission('system:dict:add') && (
            <Button
              onClick={() => {
                setEditingDict(null)
                setDictFormOpen(true)
              }}
            >
              <Plus />
              新增字典
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* 左：字典类型 */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">字典类型</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
              <Input placeholder="搜索名称 / 编码" className="ps-8" value={dictKeyword} onChange={e => setDictKeyword(e.target.value)} />
            </div>

            {loadingDicts ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : dictError ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <p className="text-muted-foreground text-sm">{dictError}</p>
                <Button variant="outline" size="sm" onClick={() => loadDicts()}>
                  重试
                </Button>
              </div>
            ) : filteredDicts.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">没有匹配的字典</p>
            ) : (
              <div className="max-h-[520px] space-y-1 overflow-y-auto">
                {filteredDicts.map(dict => (
                  <button
                    key={dict.id}
                    type="button"
                    onClick={() => setActiveId(dict.id)}
                    className={cn(
                      'w-full rounded-md px-3 py-2 text-start transition-colors',
                      dict.id === activeId ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{dict.dictName}</span>
                      <span className="text-muted-foreground shrink-0 text-xs">{dict.itemCount ?? 0} 项</span>
                    </div>
                    <div className="text-muted-foreground truncate font-mono text-xs">{dict.dictCode}</div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 右：字典项 */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-base">{activeDict ? activeDict.dictName : '字典项'}</CardTitle>
              <p className="text-muted-foreground mt-1 font-mono text-xs">{activeDict ? activeDict.dictCode : '请先在左侧选择字典'}</p>
            </div>
            {activeDict && (
              <div className="flex items-center gap-1">
                {hasPermission('system:dict:delete') && selectedCount > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setBatchDeleting(true)} disabled={batchBusy}>
                    <Trash2 className="size-4" />
                    批量删除（{selectedCount}）
                  </Button>
                )}
                {hasPermission('system:dict:add') && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingItem(null)
                      setItemFormOpen(true)
                    }}
                  >
                    <Plus />
                    新增字典项
                  </Button>
                )}
                {hasPermission('system:dict:update') && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setEditingDict(activeDict)
                      setDictFormOpen(true)
                    }}
                  >
                    <Pencil className="size-4" />
                    <span className="sr-only">编辑字典</span>
                  </Button>
                )}
                {hasPermission('system:dict:delete') && (
                  <Button variant="outline" size="icon" onClick={() => setDeletingDict(activeDict)}>
                    <Trash2 className="text-destructive size-4" />
                    <span className="sr-only">删除字典</span>
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!activeDict ? (
              <p className="text-muted-foreground py-12 text-center text-sm">请先在左侧选择一个字典</p>
            ) : loadingItems ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full max-w-xs" />
                <Skeleton className="h-56 w-full" />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full max-w-xs">
                    <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
                    <Input placeholder="搜索文本 / 值" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
                  </div>
                  <Select value={itemStatus} onValueChange={setItemStatus} items={{ all: '全部状态', '1': '启用', '0': '不启用' }}>
                    <SelectTrigger className="h-9 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部状态</SelectItem>
                      <SelectItem value="1">启用</SelectItem>
                      <SelectItem value="0">不启用</SelectItem>
                    </SelectContent>
                  </Select>
                  <DataTableViewOptions table={table} columnLabels={itemColumnLabels} />
                </div>

                <DataTable table={table} emptyText="该字典下还没有字典项" />
                <DataTablePagination table={table} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {dictFormOpen && (
        <DictFormDialog key={editingDict?.id ?? 'new'} open={dictFormOpen} onOpenChange={setDictFormOpen} dict={editingDict} onSubmit={handleDictSubmit} />
      )}

      {itemFormOpen && activeDict && (
        <DictItemFormDialog
          key={editingItem?.id ?? 'new'}
          open={itemFormOpen}
          onOpenChange={setItemFormOpen}
          dict={activeDict}
          item={editingItem}
          onSubmit={handleItemSubmit}
        />
      )}

      <ConfirmDialog
        confirmText="删除"
        open={!!deletingDict}
        onOpenChange={v => !v && setDeletingDict(null)}
        description={<>即将删除字典「{deletingDict?.dictName}」。字典下若还有字典项会拒绝删除，请先清空字典项。</>}
        onConfirm={handleDeleteDict}
      />

      <ConfirmDialog
        confirmText="删除"
        open={!!deletingItem}
        onOpenChange={v => !v && setDeletingItem(null)}
        description={<>即将删除字典项「{deletingItem?.itemText}」，该操作不可恢复。</>}
        onConfirm={handleDeleteItem}
      />

      {importOpen && (
        <ExcelImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          title="导入字典"
          description="一个工作簿两张工作表：「字典类型」与「字典项」，靠字典编码关联，可以只填其中一张。字典编码已存在时更新（已删除的会恢复），字典项按「字典编码 + 项值」判定。单表最多 2000 行。"
          templateHint="模板含两张工作表与填写说明，必须列带 *"
          onImported={() => loadDicts(activeId ?? undefined)}
          downloadTemplate={downloadDictTemplate}
          importFile={importDicts}
        />
      )}

      <ConfirmDialog
        confirmText="删除"
        open={batchDeleting}
        onOpenChange={v => !batchBusy && setBatchDeleting(v)}
        title="批量删除字典项"
        description={
          <>
            即将删除当前字典下勾选的 {selectedCount} 个字典项，该操作为硬删除，不可恢复。{batchBusy ? '正在删除，请稍候…' : ''}
          </>
        }
        onConfirm={handleBatchDelete}
      />
    </div>
  )
}
