import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useDataTable } from '@/components/data-table'
import { notifyPermissionsChanged } from '@/lib/permissions'
import { getApiResult } from '@/lib/http'
import type { MenuTreeNode } from './components/role-permission-dialog'
import { RoleFormDialog, type RoleFormValues } from './components/role-form-dialog'
import { RolePermissionDialog } from './components/role-permission-dialog'
import { createRole, deleteRole, fetchRoleMenuIds, fetchRoles, saveRoleMenus, updateRole, type Role } from './api'

const columnLabels: Record<string, string> = {
  roleCode: '权限字符',
  roleName: '角色名称',
  description: '描述',
  createTime: '创建时间'
}

export function RolePage() {
  const [list, setList] = useState<Role[] | null>(null)
  const [menuTree, setMenuTree] = useState<MenuTreeNode[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState<Role | null>(null)
  /** 授权弹窗：角色 + 打开时回显的已授权 id */
  const [permRole, setPermRole] = useState<{ role: Role; menuIds: string[] } | null>(null)
  const [permSaving, setPermSaving] = useState(false)

  const load = () => {
    setLoading(true)
    setError(null)
    // 菜单树加载失败不阻塞列表（授权弹窗会提示重试）
    Promise.all([fetchRoles(), getApiResult<MenuTreeNode[]>('/backend-api/menus/tree').catch(() => [])])
      .then(([roleList, tree]) => {
        setList(roleList)
        setMenuTree(tree)
      })
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const roles = useMemo(() => list ?? [], [list])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (role: Role) => {
    setEditing(role)
    setFormOpen(true)
  }

  /** 打开授权弹窗：先拉角色当前已授权 id 用于回显 */
  const openPerm = (role: Role) => {
    setPermRole({ role, menuIds: [] })
    fetchRoleMenuIds(role.id)
      .then(menuIds => setPermRole({ role, menuIds }))
      .catch(e => {
        toast.error(e instanceof Error ? e.message : '加载角色权限失败')
        setPermRole(null)
      })
  }

  const columns = useMemo<ColumnDef<Role>[]>(
    () => [
      {
        accessorKey: 'roleCode',
        header: ({ column }) => <DataTableColumnHeader column={column} title="权限字符" />,
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue('roleCode')}</span>
      },
      {
        accessorKey: 'roleName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="角色名称" />,
        cell: ({ row }) => <span className="font-medium">{row.getValue('roleName') ?? '-'}</span>
      },
      {
        accessorKey: 'description',
        header: '描述',
        enableSorting: false,
        cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('description') ?? '-'}</span>
      },
      {
        accessorKey: 'createTime',
        header: ({ column }) => <DataTableColumnHeader column={column} title="创建时间" />,
        cell: ({ row }) => {
          const v = row.getValue<string | undefined>('createTime')
          return <span className="font-mono text-xs">{v ? String(v).slice(0, 19).replace('T', ' ') : '-'}</span>
        }
      },
      {
        id: 'permCount',
        header: () => <div>已授权</div>,
        enableSorting: false,
        cell: ({ row }) => <span>{row.original.permissions?.length ?? 0} 项</span>
      },
      {
        id: 'actions',
        header: () => <div className="text-end">操作</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="text-end">
            <Button variant="ghost" size="icon" title="分配权限" onClick={() => openPerm(row.original)}>              <ShieldCheck className="size-4" />
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

  const { table, keyword, setKeyword } = useDataTable({ data: roles, columns })

  const handleSubmit = (values: RoleFormValues) => {
    const req = editing ? updateRole(editing.id, values) : createRole(values)
    req
      .then(() => {
        toast.success(editing ? '角色已更新' : '角色已创建')
        setFormOpen(false)
        load()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '保存失败'))
  }

  const handlePermissionSubmit = (menuIds: string[]) => {
    if (!permRole) return
    setPermSaving(true)
    saveRoleMenus(permRole.role.id, menuIds)
      .then(() => {
        toast.success(`已更新角色「${permRole.role.roleName ?? permRole.role.roleCode}」的权限，相关用户重新登录后生效`)
        // 角色权限可能变化，通知侧边栏重新计算可见菜单
        notifyPermissionsChanged()
        setPermRole(null)
        load()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '保存失败'))
      .finally(() => setPermSaving(false))
  }

  const handleDelete = () => {
    if (!deleting) return
    deleteRole(deleting.id)
      .then(() => {
        toast.success(`已删除角色「${deleting.roleName ?? deleting.roleCode}」`)
        setDeleting(null)
        load()
      })
      .catch(e => {
        toast.error(e instanceof Error ? e.message : '删除失败')
        setDeleting(null)
      })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">角色权限</h1>
          <p className="text-muted-foreground text-sm">共 {roles.length} 个角色{permSaving && '（保存中…）'}</p>
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
          key={permRole.role.id}
          open={!!permRole}
          onOpenChange={v => !v && setPermRole(null)}
          role={permRole.role}
          tree={menuTree}
          checkedIds={permRole.menuIds}
          saving={permSaving}
          onSubmit={handlePermissionSubmit}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除角色「{deleting?.roleName ?? deleting?.roleCode}」，该操作不可恢复。</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}
