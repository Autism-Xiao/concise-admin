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
import { RoleFormDialog } from './components/role-form-dialog'
import { roles as mockRoles, type Role } from './data/roles'

const columnLabels: Record<string, string> = {
  id: 'ID',
  name: '角色名称',
  code: '权限字符',
  userCount: '用户数',
  createdAt: '创建时间',
  status: '状态'
}

export function RolePage() {
  const [list, setList] = useState<Role[]>(mockRoles)
  const [statusFilter, setStatusFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState<Role | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (role: Role) => {
    setEditing(role)
    setFormOpen(true)
  }

  const columns = useMemo<ColumnDef<Role>[]>(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="角色名称" />,
        cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>
      },
      {
        accessorKey: 'code',
        header: ({ column }) => <DataTableColumnHeader column={column} title="权限字符" />,
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue('code')}</span>
      },
      {
        accessorKey: 'userCount',
        header: ({ column }) => <DataTableColumnHeader column={column} title="用户数" />
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="创建时间" />
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="状态" />,
        cell: ({ row }) => {
          const status = row.getValue<Role['status']>('status')
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

  const handleSubmit = (values: Pick<Role, 'name' | 'code' | 'status'>) => {
    if (editing) {
      setList(prev => prev.map(r => (r.id === editing.id ? { ...r, ...values } : r)))
      toast.success('角色已更新')
    } else {
      setList(prev => [{ ...values, id: Math.max(...prev.map(r => r.id)) + 1, userCount: 0, createdAt: new Date().toISOString().slice(0, 10) }, ...prev])
      toast.success('角色已创建')
    }
    setFormOpen(false)
  }

  const handleDelete = () => {
    if (!deleting) return
    setList(prev => prev.filter(r => r.id !== deleting.id))
    toast.success(`已删除角色「${deleting.name}」`)
    setDeleting(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">角色权限</h1>
          <p className="text-muted-foreground text-sm">共 {list.length} 个角色（mock 数据）</p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          新增角色
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
              <Input placeholder="搜索名称 / 权限字符" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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

          <DataTable table={table} emptyText="没有匹配的角色" />
          <DataTablePagination table={table} />
        </CardContent>
      </Card>

      {formOpen && <RoleFormDialog key={editing?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} role={editing} onSubmit={handleSubmit} />}

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除角色「{deleting?.name}」，该操作不可恢复。</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}
