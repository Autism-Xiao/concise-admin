import { useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { StatusBadge } from '@/components/status-badge'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useDataTable } from '@/components/data-table'
import { MenuFormDialog } from './components/menu-form-dialog'
import { menus as mockMenus, type Menu } from './data/menus'

const columnLabels: Record<string, string> = {
  id: 'ID',
  name: '菜单名称',
  path: '路由地址',
  sort: '排序',
  status: '状态'
}

export function MenuPage() {
  const [list, setList] = useState<Menu[]>(mockMenus)
  const [statusFilter, setStatusFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Menu | null>(null)
  const [deleting, setDeleting] = useState<Menu | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (menu: Menu) => {
    setEditing(menu)
    setFormOpen(true)
  }

  const columns = useMemo<ColumnDef<Menu>[]>(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="菜单名称" />,
        cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>
      },
      {
        accessorKey: 'path',
        header: ({ column }) => <DataTableColumnHeader column={column} title="路由地址" />,
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue('path')}</span>
      },
      {
        accessorKey: 'sort',
        header: ({ column }) => <DataTableColumnHeader column={column} title="排序" />
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="状态" />,
        cell: ({ row }) => {
          const status = row.getValue<Menu['status']>('status')
          return <StatusBadge ok={status === '正常'} label={status} />
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
  const { table, keyword, setKeyword } = useDataTable({ data: list, columns, columnFilters })

  const handleSubmit = (values: Omit<Menu, 'id'>) => {
    if (editing) {
      setList(prev => prev.map(m => (m.id === editing.id ? { ...m, ...values } : m)))
      toast.success('菜单已更新')
    } else {
      setList(prev => [{ ...values, id: Math.max(...prev.map(m => m.id)) + 1 }, ...prev])
      toast.success('菜单已创建')
    }
    setFormOpen(false)
  }

  const handleDelete = () => {
    if (!deleting) return
    setList(prev => prev.filter(m => m.id !== deleting.id))
    toast.success(`已删除菜单「${deleting.name}」`)
    setDeleting(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">菜单管理</h1>
          <p className="text-muted-foreground text-sm">共 {list.length} 个菜单（mock 数据）</p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          新增菜单
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
              <Input placeholder="搜索名称 / 路由" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
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

          <DataTable table={table} emptyText="没有匹配的菜单" />
          <DataTablePagination table={table} />
        </CardContent>
      </Card>

      {formOpen && <MenuFormDialog key={editing?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} menu={editing} onSubmit={handleSubmit} />}

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除菜单「{deleting?.name}」，该操作不可恢复。</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}
