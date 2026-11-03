import { useEffect, useMemo, useState } from 'react'
import { MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useDataTable } from '@/components/data-table'
import { RegionFormDialog } from './components/region-form-dialog'
import { fetchRegions, saveRegions, type Region } from './api'
import { withOperationLog } from '@/features/system/log/api'

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

export function RegionPage() {
  const [list, setList] = useState<Region[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Region | null>(null)
  const [deleting, setDeleting] = useState<Region | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchRegions()
      .then(setList)
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const regions = useMemo(() => list ?? [], [list])

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

  const { table, keyword, setKeyword } = useDataTable({ data: regions, columns })

  const handleSubmit = (values: Omit<Region, 'id'>) => {
    if (editing) {
      persist(
        regions.map(r => (r.id === editing.id ? { ...r, ...values } : r)),
        '区划已更新'
      )
    } else {
      const id = regions.length ? Math.max(...regions.map(r => r.id)) + 1 : 1
      persist([{ ...values, id }, ...regions], '区划已创建')
    }
    setFormOpen(false)
  }

  const handleDelete = () => {
    if (!deleting) return
    persist(
      regions.filter(r => r.id !== deleting.id),
      `已删除区划「${deleting.name}」`
    )
    setDeleting(null)
  }

  /** 乐观更新 + 写回 regions.json，失败回退重新加载；操作记入操作日志 */
  const persist = (next: Region[], successMsg: string) => {
    setList(next)
    withOperationLog(successMsg, () => saveRegions(next))
      .then(() => toast.success(successMsg))
      .catch(() => {
        toast.error('写入 regions.json 失败，已重新加载')
        load()
      })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">行政区划</h1>
          <p className="text-muted-foreground text-sm">共 {regions.length} 个省级区划（mock 数据）</p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          新增区划
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
                <Input placeholder="搜索名称 / 代码 / 拼音" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
              <DataTableViewOptions table={table} columnLabels={columnLabels} />
            </div>

            <DataTable table={table} emptyText="没有匹配的区划" />
            <DataTablePagination table={table} />
          </CardContent>
        </Card>
      )}

      {formOpen && <RegionFormDialog key={editing?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} region={editing} onSubmit={handleSubmit} />}

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除区划「{deleting?.name}」，该操作不可恢复。</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}
