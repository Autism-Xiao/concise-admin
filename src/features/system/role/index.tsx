import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Pencil, Plus, Search, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { RefreshButton } from '@/components/ui/refresh-button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useServerTable, type ServerTableQuery } from '@/components/data-table'
import { hasPermission } from '@/lib/auth'
import { saveBlobFile } from '@/lib/download'
import { notifyPermissionsChanged, isSuperRoleCode } from '@/lib/permissions'
import { fetchMenuTree } from '@/features/system/menu/api'
import type { MenuTreeNode } from './components/role-permission-dialog'
import { RoleFormDialog, type RoleFormValues } from './components/role-form-dialog'
import { RoleImportDialog } from './components/role-import-dialog'
import { RolePermissionDialog } from './components/role-permission-dialog'
import { createRole, deleteRole, deleteRoles, exportRoles, fetchRoleMenuIds, fetchRolePage, fetchRoles, saveRoleMenus, updateRole, type Role } from './api'
import { toastBatchResult } from '@/lib/batch-delete'

const columnLabels: Record<string, string> = {
  roleName: '角色名称',
  roleCode: '权限字符',
  status: '状态',
  description: '描述',
  createTime: '创建时间'
}

export function RolePage() {
  const [menuTree, setMenuTree] = useState<MenuTreeNode[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState<Role | null>(null)
  /** 授权弹窗：角色 + 打开时回显的已授权 id */
  const [permRole, setPermRole] = useState<{ role: Role; menuIds: string[] } | null>(null)
  const [permLoading, setPermLoading] = useState(false)
  const [permSaving, setPermSaving] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  // 菜单树是授权弹窗的数据源，与列表筛选无关：单独拉一次，失败不阻塞列表
  useEffect(() => {
    fetchMenuTree()
      .then(setMenuTree)
      .catch(() => setMenuTree([]))
  }, [])

  /** 列表查询：搜索/归属筛选/排序/翻页都由接口完成 */
  const fetchPage = useCallback(
    ({ page, pageSize, keyword, filters, sortBy, sortOrder }: ServerTableQuery<{ tenantId: string }>) =>
      fetchRolePage({
        page,
        pageSize,
        keyword,
        tenantId: filters.tenantId === 'all' ? undefined : Number(filters.tenantId),
        sortBy,
        sortOrder
      }),
    []
  )

  /* ---------- 归属筛选 + 分组（平台视角下会看到多个租户各自的同名角色模板） ---------- */

  /** 归属筛选：key 是 tenantId 的字符串形式，'0' = 平台共享，'all' = 不筛选（由接口过滤） */
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  /** 归属下拉选项：进入页面时拉一次全量快照（角色总量小），之后切筛选不会丢选项 */
  const [ownerOptions, setOwnerOptions] = useState<Record<string, string>>({ all: '全部归属' })
  useEffect(() => {
    fetchRoles()
      .then(list => {
        const map: Record<string, string> = {}
        for (const role of list) {
          const key = String(role.tenantId ?? 0)
          if (!map[key]) map[key] = key === '0' ? '平台共享' : (role.tenantName ?? `租户 ${key}`)
        }
        setOwnerOptions({ all: '全部归属', ...map })
      })
      .catch(() => setOwnerOptions({ all: '全部归属' }))
  }, [])

  const groupOf = useCallback((role: Role) => String(role.tenantId ?? 0), [])
  const groupLabel = useCallback(
    (groupId: string) => {
      if (groupId === '0') {
        return (
          <span title="平台共享角色：所有租户都可见、可分配给用户">
            平台共享<span className="text-muted-foreground font-normal">（所有租户可见）</span>
          </span>
        )
      }
      const tenantName = ownerOptions[groupId] ?? `租户 ${groupId}`
      return <span title="租户私有角色：只在归属租户内可见、可分配">租户：{tenantName}</span>
    },
    [ownerOptions]
  )

  /** 正在切换状态的行 id（行级 loading，防止连点） */
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const togglingRef = useRef<string | null>(null)
  /** 重新拉当前页：表格数据在 useServerTable 内部，行内操作完成后用它刷新（定义在表格之后） */
  const reloadRef = useRef<(() => void) | null>(null)

  /** 表格里直接开关角色状态；停用后该角色立即失去权限 */
  const toggleStatus = useCallback(
    (role: Role, checked: boolean) => {
      const next = checked ? 1 : 0
      if (role.status === next || togglingRef.current) return
      togglingRef.current = role.id
      setTogglingId(role.id)
      updateRole(role.id, { status: next })
        .then(() => {
          toast.success(
            checked ? `已启用「${role.roleName ?? role.roleCode}」` : `已停用「${role.roleName ?? role.roleCode}」，该角色权限立即失效`
          )
          // 权限接口（菜单树/按钮码）有会话级缓存，通知清一下，被停用角色的在线用户下次拉取就看不到菜单了
          notifyPermissionsChanged()
        })
        .catch(e => toast.error(e instanceof Error ? e.message : '状态修改失败'))
        .finally(() => {
          togglingRef.current = null
          setTogglingId(null)
          reloadRef.current?.()
        })
    },
    []
  )

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (role: Role) => {
    setEditing(role)
    setFormOpen(true)
  }

  /** 先取得真实授权 id 再挂载弹窗，避免空初始值覆盖已有权限 */
  const openPerm = (role: Role) => {
    setPermLoading(true)
    fetchRoleMenuIds(role.id)
      .then(menuIds => setPermRole({ role, menuIds }))
      .catch(e => {
        toast.error(e instanceof Error ? e.message : '加载角色权限失败')
      })
      .finally(() => setPermLoading(false))
  }

  const columns = useMemo<ColumnDef<Role>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            className="accent-primary size-4 cursor-pointer align-middle"
            aria-label="全选本页"
            checked={table.getIsAllPageRowsSelected()}
            ref={el => {
              if (el) el.indeterminate = table.getIsSomePageRowsSelected()
            }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="accent-primary size-4 cursor-pointer align-middle"
            aria-label={`选择「${row.original.roleName ?? row.original.roleCode}」`}
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        enableSorting: false,
        enableHiding: false
      },
      {
        accessorKey: 'roleName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="角色名称" />,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.roleName ?? '-'}</span>
            {/* 平台视角会看到多个租户各自的 admin/editor/viewer 模板（同名同码是设计如此），
                不标归属会被当成重复数据；tenantName 由后端在平台视角下附加 */}
            {row.original.tenantName ? <span className="text-muted-foreground text-xs">租户：{row.original.tenantName}</span> : null}
          </div>
        )
      },
      {
        accessorKey: 'roleCode',
        header: ({ column }) => <DataTableColumnHeader column={column} title="权限字符" />,
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue('roleCode')}</span>
      },
      {
        accessorKey: 'status',
        header: () => <div>状态</div>,
        enableSorting: false,
        cell: ({ row }) => {
          const role = row.original
          const builtin = isSuperRoleCode(role.roleCode)
          const busy = togglingId === role.id
          return (
            <Switch
              checked={role.status !== 0}
              disabled={builtin || busy}
              aria-label={builtin ? '内置管理员角色不允许停用' : role.status !== 0 ? '停用角色' : '启用角色'}
              onCheckedChange={checked => void toggleStatus(role, checked)}
            />
          )
        }
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
        cell: ({ row }) =>
          // 超管权限是内置全量，不来自授权表，显示项数会误导
          isSuperRoleCode(row.original.roleCode) ? (
            <span className="text-muted-foreground">全部（内置）</span>
          ) : (
            <span>{row.original.permissions?.length ?? 0} 项</span>
          )
      },
      {
        id: 'actions',
        header: () => <div className="text-end">操作</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const builtin = isSuperRoleCode(row.original.roleCode)
          return (
            <div className="text-end">
              <Button
                variant="ghost"
                size="icon"
                title={builtin ? '内置超级管理员拥有全部权限，授权不生效' : '分配权限'}
                disabled={permLoading || builtin}
                onClick={() => openPerm(row.original)}
              >
                <ShieldCheck className="size-4" />
                <span className="sr-only">分配权限</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}>
                <Pencil className="size-4" />
                <span className="sr-only">编辑</span>
              </Button>
              <Button variant="ghost" size="icon" title={builtin ? '内置管理员角色不允许删除' : '删除'} disabled={builtin} onClick={() => setDeleting(row.original)}>
                <Trash2 className="text-destructive size-4" />
                <span className="sr-only">删除</span>
              </Button>
            </div>
          )
        }
      }
    ],
    [permLoading, togglingId, toggleStatus]
  )

  // 服务端分页：角色总量小，pageSize 放大到 50，分组表头基本不会跨页重复
  const { table, keyword, setKeyword, loading, booted, error, total, reload, rowSelection, setRowSelection } = useServerTable({
    columns,
    query: fetchPage,
    filters: { tenantId: ownerFilter },
    pageSize: 50,
    getRowId: role => role.id
  })
  useEffect(() => {
    reloadRef.current = reload
  }, [reload])
  // 供表格之外的行内操作刷新（toggleStatus 定义在表格之前）
  const pageRoles = table.getRowModel().rows.map(row => row.original)
  const selectedCount = Object.keys(rowSelection).filter(key => rowSelection[key]).length
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [batchBusy, setBatchBusy] = useState(false)

  const handleBatchDelete = async () => {
    const targets = table.getSelectedRowModel().rows.map(row => row.original)
    if (!targets.length || batchBusy) return
    setBatchBusy(true)
    try {
      const result = await deleteRoles(targets.map(role => role.id))
      toastBatchResult(result, '角色')
      setBatchDeleting(false)
      setRowSelection({})
      reload()
    } finally {
      setBatchBusy(false)
    }
  }

  const handleSubmit = (values: RoleFormValues) => {
    const req = editing ? updateRole(editing.id, values) : createRole(values)
    req
      .then(() => {
        toast.success(editing ? '角色已更新' : '角色已创建')
        setFormOpen(false)
        reload()
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
        reload()
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
        reload()
      })
      .catch(e => {
        toast.error(e instanceof Error ? e.message : '删除失败')
        setDeleting(null)
      })
  }

  /** 导出 Excel：把当前搜索关键字带给后端，导出的是筛选后的结果（.xlsx，不传关键字即全量） */
  const handleExport = () => {
    setExporting(true)
    exportRoles(keyword.trim())
      .then(({ filename, blob }) => {
        saveBlobFile(filename, blob)
        toast.success('角色已导出')
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '导出失败'))
      .finally(() => setExporting(false))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">角色权限</h1>
          <p className="text-muted-foreground text-sm">
            {ownerFilter === 'all' ? `共 ${total >= 0 ? total : 0} 个角色` : `筛选出 ${total >= 0 ? total : 0} 个角色`}
            {permSaving && '（保存中…）'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPermission('system:role:delete') && selectedCount > 0 && (
            <Button variant="outline" onClick={() => setBatchDeleting(true)} disabled={batchBusy}>
              <Trash2 />
              批量删除（{selectedCount}）
            </Button>
          )}
          {hasPermission('system:role:export') && (
            <Button variant="outline" onClick={handleExport} disabled={exporting || pageRoles.length === 0}>
              <Download />
              {exporting ? '导出中…' : '导出'}
            </Button>
          )}
          {hasPermission('system:role:import') && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload />
              导入
            </Button>
          )}
          <Button onClick={openCreate}>
            <Plus />
            新增角色
          </Button>
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
                <Input placeholder="搜索名称 / 权限字符" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
              <Select value={ownerFilter} onValueChange={setOwnerFilter} items={ownerOptions}>
                <SelectTrigger className="h-9 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部归属</SelectItem>
                  {[...Object.entries(ownerOptions).filter(([key]) => key !== 'all')].map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <RefreshButton onClick={() => void reload()} />
              <DataTableViewOptions table={table} columnLabels={columnLabels} />
            </div>

            <DataTable table={table} loading={loading} emptyText="没有匹配的角色" groupOf={groupOf} groupLabel={groupLabel} />
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

      <ConfirmDialog
        confirmText="删除"
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除角色「{deleting?.roleName ?? deleting?.roleCode}」，该操作不可恢复。</>}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        confirmText="删除"
        open={batchDeleting}
        onOpenChange={v => !batchBusy && setBatchDeleting(v)}
        title="批量删除角色"
        description={
          <>
            即将删除勾选的 {selectedCount} 个角色，该操作不可恢复。{batchBusy ? '正在删除，请稍候…' : ''}
          </>
        }
        onConfirm={handleBatchDelete}
      />

      {importOpen && <RoleImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={reload} />}
    </div>
  )
}
