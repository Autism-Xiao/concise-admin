import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapPin, Pencil, Plus, RefreshCw, Search, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useDataTable } from '@/components/data-table'
import { RegionFormDialog } from './components/region-form-dialog'
import { RegionImportDialog } from './components/region-import-dialog'
import { deleteRegion, fetchRegions, type Region } from './api'

const columnLabels: Record<string, string> = {
  id: 'ID',
  name: '名称',
  shortName: '简称',
  areaCode: '区划代码',
  levelText: '层级',
  zipCode: '邮编',
  pinyin: '拼音',
  lng: '经纬度'
}

const LEVEL_ITEMS: Record<string, string> = { '': '全部层级', '0': '省份', '1': '城市', '2': '区县', '3': '街道' }

export function RegionPage() {
  const [page, setPage] = useState<{ records: Region[]; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Region | null>(null)
  const [deleting, setDeleting] = useState<Region | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchRegions({ keyword, level: levelFilter === '' ? undefined : Number(levelFilter) })
      .then(res => setPage({ records: res.records, total: res.total }))
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }, [keyword, levelFilter])

  // 关键字/层级变化后自动查询（输入防抖 300ms）
  useEffect(() => {
    const timer = setTimeout(load, keyword ? 300 : 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, levelFilter])

  const regions = useMemo(() => page?.records ?? [], [page])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (region: Region) => {
    setEditing(region)
    setFormOpen(true)
  }

  const columns = useMemo<ColumnDef<Region>[]>(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="名称" />,
        cell: ({ row }) => (
          <span className="flex items-center gap-2 font-medium">
            <MapPin className="text-muted-foreground size-4 shrink-0" />
            {row.getValue('name')}
          </span>
        )
      },
      {
        accessorKey: 'shortName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="简称" />
      },
      {
        accessorKey: 'areaCode',
        header: ({ column }) => <DataTableColumnHeader column={column} title="区划代码" />,
        cell: ({ row }) => <code className="bg-muted rounded px-1.5 py-0.5 text-xs tabular-nums">{row.getValue('areaCode')}</code>
      },
      {
        accessorKey: 'levelText',
        header: ({ column }) => <DataTableColumnHeader column={column} title="层级" />
      },
      {
        accessorKey: 'parentCode',
        header: '上级代码',
        cell: ({ row }) => <code className="text-muted-foreground text-xs">{row.getValue('parentCode')}</code>
      },
      {
        accessorKey: 'zipCode',
        header: '邮编',
        cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{row.getValue('zipCode')}</span>
      },
      {
        accessorKey: 'pinyin',
        header: '拼音',
        cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('pinyin')}</span>
      },
      {
        id: 'lng',
        accessorFn: row => `${row.lng}, ${row.lat}`,
        header: '经纬度',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs tabular-nums">
            {row.original.lng}, {row.original.lat}
          </span>
        )
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

  const { table, setKeyword: setTableKeyword } = useDataTable({ data: regions, columns })

  const handleDelete = async () => {
    if (!deleting) return
    const target = deleting
    setDeleting(null)
    try {
      await deleteRegion(target.id)
      toast.success(`已删除区划「${target.name}」`)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">行政区划</h1>
          <p className="text-muted-foreground text-sm">
            共 {page?.total ?? 0} 条区划（省 / 市 / 区县数据通过「导入区划」批量维护）
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload />
            导入区划
          </Button>
          <Button variant="outline" onClick={load}>
            <RefreshCw />
            刷新
          </Button>
          <Button onClick={openCreate}>
            <Plus />
            新增区划
          </Button>
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
                <Input
                  placeholder="搜索名称 / 代码 / 拼音"
                  className="ps-8"
                  value={keyword}
                  onChange={e => {
                    setKeyword(e.target.value)
                    setTableKeyword('')
                  }}
                />
              </div>
              <Select value={levelFilter} onValueChange={setLevelFilter} items={LEVEL_ITEMS}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEVEL_ITEMS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DataTableViewOptions table={table} columnLabels={columnLabels} />
            </div>

            <DataTable table={table} emptyText="没有匹配的区划" />
            <DataTablePagination table={table} />
          </CardContent>
        </Card>
      )}

      {formOpen && <RegionFormDialog key={editing?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} region={editing} onSaved={load} />}

      <RegionImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => {
          load()
        }}
      />

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除区划「{deleting?.name}」。存在下级区划时会被拒绝，请先删除下级。</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}
