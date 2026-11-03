import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react'
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
import { notifyPermissionsChanged } from '@/lib/permissions'
import { fetchMenus, type Menu } from '../menu/api'
import { RoleFormDialog } from './components/role-form-dialog'
import { RolePermissionDialog } from './components/role-permission-dialog'
import { fetchRoles, saveRoles, type Role } from './api'
import { withOperationLog } from '@/features/system/log/api'

const columnLabels: Record<string, string> = {
  id: 'ID',
  name: '角色名称',
  code: '权限字符',
  userCount: '用户数',
  createdAt: '创建时间',
  status: '状态'
}

export function RolePage() {
  const [list, setList] = useState<Role[] | null>(null)
  const [menus, setMenus] = useState<Menu[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState<Role | null>(null)
  const [permRole, setPermRole] = useState<Role | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    Promise.all([fetchRoles(), fetchMenus()])
      .then(([roleList, menuList]) => {
        setList(roleList)
        setMenus(menuList)
      })
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const roles = useMemo(() => list ?? [], [list])

  /** 乐观更新 + 写回 roles.json，失败回退重新加载；操作记入操作日志 */
  const persist = (next: Role[], successMsg: string) => {
    setList(next)
    setSaving(true)
    withOperationLog(successMsg, () => saveRoles(next))
      .then(() => {
        toast.success(successMsg)
        // 角色权限可能变化，通知侧边栏重新计算可见菜单
        notifyPermissionsChanged()
      })
      .catch(() => {
        toast.error('写入 roles.json 失败，已重新加载')
        load()
      })
      .finally(() => setSaving(false))
  }

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
            <Button variant="ghost" size="icon" title="分配权限" onClick={() => setPermRole(row.original)}>
              <ShieldCheck className="size-4" />
              <span className="sr-only">分配权限</span>
            </Button>
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
  const { table, keyword, setKeyword } = useDataTable({ data: roles, columns, columnFilters })

  const handleSubmit = (values: Pick<Role, 'name' | 'code' | 'status'>) => {
    if (editing) {
      persist(
        roles.map(r => (r.id === editing.id ? { ...r, ...values } : r)),
        '角色已更新'
      )
    } else {
      const id = roles.length ? Math.max(...roles.map(r => r.id)) + 1 : 1
      persist([{ ...values, id, userCount: 0, createdAt: new Date().toISOString().slice(0, 10), menus: [] }, ...roles], '角色已创建')
    }
    setFormOpen(false)
  }

  const handlePermissionSubmit = (menuIds: number[]) => {
    if (!permRole) return
    persist(
      roles.map(r => (r.id === permRole.id ? { ...r, menus: menuIds } : r)),
      `已更新角色「${permRole.name}」的菜单权限`
    )
  }

  const handleDelete = () => {
    if (!deleting) return
    persist(
      roles.filter(r => r.id !== deleting.id),
      `已删除角色「${deleting.name}」`
    )
    setDeleting(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">角色权限</h1>
          <p className="text-muted-foreground text-sm">
            共 {roles.length} 个角色（mock 数据）{saving && '（保存中…）'}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          新增角色
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
                <Input placeholder="搜索名称 / 权限字符" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
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

            <DataTable table={table} emptyText="没有匹配的角色" />
            <DataTablePagination table={table} />
          </CardContent>
        </Card>
      )}

      {formOpen && <RoleFormDialog key={editing?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} role={editing} onSubmit={handleSubmit} />}

      {permRole && (
        <RolePermissionDialog
          key={permRole.id}
          open={!!permRole}
          onOpenChange={v => !v && setPermRole(null)}
          role={permRole}
          menus={menus}
          onSubmit={handlePermissionSubmit}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除角色「{deleting?.name}」，该操作不可恢复。</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}
