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
import { hasPermission } from '@/lib/auth'
import { LevelFormDialog } from './components/level-form-dialog'
import { createLevel, deleteLevel, fetchLevels, updateLevel, type Level, type LevelWritePayload } from './api'
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
  const { table, keyword, setKeyword } = useDataTable({ data: levels, columns, columnFilters })

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
        {hasPermission('system:level:add') && (
          <Button onClick={openCreate}>
            <Plus />
            新增职级
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

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除职级「{deleting?.levelName}」，该操作为硬删除，不可恢复。</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}
