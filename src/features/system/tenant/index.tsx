import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleAlert, KeyRound, Pencil, Plus, RefreshCw, Search, Trash2, Users, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { StatusBadge } from '@/components/status-badge'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useDataTable } from '@/components/data-table'
import { hasPermission } from '@/lib/auth'
import { isUnavailableError, userMessageOf } from '@/lib/api-error'
import { TenantFormDialog } from './components/tenant-form-dialog'
import { TenantUserDialog } from './components/tenant-user-dialog'
import { createTenant, deleteTenant, fetchTenants, provisionAllTenants, provisionTenant, updateTenant, type Tenant, type TenantPlan, type TenantProvisionRole } from './api'

const columnLabels: Record<string, string> = {
  id: 'ID',
  name: '租户名称',
  code: '租户编码',
  contact: '联系人 / 电话',
  plan: '套餐',
  userCount: '用户数',
  expireAt: '到期日期',
  status: '状态',
  remark: '备注'
}

/**
 * 默认收起的列
 *
 * 租户表 11 列在 1280 笔记本上必然横向滚动，把「内部主键」和「长文本备注」先收起来，
 * 首屏就能看到数据主体与操作列；需要时在右上角「列显示」里打开。
 * 必须是模块级常量：传给 useDataTable 后进 TanStack 的 initialState，每次渲染新建数组会反复触发重置。
 */
const HIDDEN_COLUMNS = ['id', 'remark']

/** 到期日 30 天内高亮提醒 */
function isExpiringSoon(expireAt: string): boolean {
  if (!expireAt) return false
  const days = (new Date(expireAt).getTime() - Date.now()) / 86400000
  return days >= 0 && days <= 30
}

/**
 * 把初始化结果翻译成人话
 *
 * 幂等接口重复点是不会变的，必须明确告诉用户「已是最新」，
 * 否则看到"成功"却什么都没变，会以为按钮坏了。
 */
function summarizeProvision(roles: TenantProvisionRole[]): string {
  const created = roles.filter(role => role.created).length
  const added = roles.reduce((sum, role) => sum + role.added, 0)
  if (!created && !added) return '默认角色与授权已是最新'
  const parts: string[] = []
  if (created) parts.push(`新建 ${created} 个角色`)
  if (added) parts.push(`补齐 ${added} 项授权`)
  return parts.join('，')
}

export function TenantPage() {
  const [list, setList] = useState<Tenant[] | null>(null)
  // 区分「服务连不上」和「业务失败」：前者要解释成因并给重试，后者直接显示原因
  const [error, setError] = useState<{ message: string; unavailable: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Tenant | null>(null)
  const [deleting, setDeleting] = useState<Tenant | null>(null)
  const [assigning, setAssigning] = useState<Tenant | null>(null)
  const [saving, setSaving] = useState(false)
  /** 正在初始化的目标：租户 id 或 'all'，用于禁用按钮防重复提交 */
  const [provisioning, setProvisioning] = useState<number | 'all' | null>(null)

  const canAdd = hasPermission('system:tenant:add')
  const canEdit = hasPermission('system:tenant:edit')
  const canDelete = hasPermission('system:tenant:delete')
  const canAssign = hasPermission('system:tenant:user')

  const load = () => {
    setLoading(true)
    setError(null)
    fetchTenants()
      .then(setList)
      .catch(e => setError({ message: userMessageOf(e, '加载失败'), unavailable: isUnavailableError(e) }))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const tenants = useMemo(() => list ?? [], [list])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (tenant: Tenant) => {
    setEditing(tenant)
    setFormOpen(true)
  }

  /**
   * 补齐单个租户的默认角色
   *
   * 用 useCallback 固定引用：它会进 columns 的依赖数组，每次渲染新建函数会让列定义整表重建。
   */
  const handleProvision = useCallback((tenant: Tenant) => {
    setProvisioning(tenant.id)
    provisionTenant(tenant.id)
      .then(result => toast.success(`「${tenant.name}」${summarizeProvision(result.roles)}`))
      .catch(error => toast.error(error instanceof Error ? error.message : '初始化失败'))
      .finally(() => setProvisioning(null))
  }, [])

  /** 全部租户一次补齐：平台新增租户级菜单后，各租户的管理员角色需要跟上 */
  const handleProvisionAll = () => {
    setProvisioning('all')
    provisionAllTenants()
      .then(result => {
        const changed = result.createdRoles > 0 || result.addedGrants > 0
        const summary = changed ? `新建 ${result.createdRoles} 个角色，补齐 ${result.addedGrants} 项授权` : '默认角色与授权已是最新'
        toast.success(`已同步 ${result.tenants} 个租户：${summary}`)
      })
      .catch(error => toast.error(error instanceof Error ? error.message : '同步失败'))
      .finally(() => setProvisioning(null))
  }

  const columns = useMemo<ColumnDef<Tenant>[]>(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="租户名称" />,
        cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>
      },
      {
        accessorKey: 'code',
        header: ({ column }) => <DataTableColumnHeader column={column} title="租户编码" />,
        cell: ({ row }) => <code className="bg-muted rounded px-1.5 py-0.5 text-xs">{row.getValue('code')}</code>
      },
      {
        // 联系人与电话合成一列：两列各占一次单元格内边距，1280 笔记本上正好差这几十像素
        // （合并前表格内滚 31px，操作列被挤出可视区）
        id: 'contact',
        accessorFn: row => `${row.contact ?? ''} ${row.phone ?? ''}`.trim(),
        header: '联系人',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-col leading-tight">
            <span>{row.original.contact || '—'}</span>
            {row.original.phone && <span className="text-muted-foreground text-xs tabular-nums">{row.original.phone}</span>}
          </div>
        )
      },
      {
        accessorKey: 'plan',
        header: ({ column }) => <DataTableColumnHeader column={column} title="套餐" />,
        cell: ({ row }) => {
          const plan = row.getValue<TenantPlan>('plan')
          const cls = plan === '企业版' ? 'text-primary' : plan === '标准版' ? '' : 'text-muted-foreground'
          return <span className={cls}>{plan}</span>
        }
      },
      {
        accessorKey: 'userCount',
        header: ({ column }) => <DataTableColumnHeader column={column} title="用户数" />,
        cell: ({ row }) => <span className="tabular-nums">{row.getValue<number>('userCount') ?? 0}</span>
      },
      {
        accessorKey: 'expireAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="到期日期" />,
        cell: ({ row }) => {
          const expireAt = row.getValue<string>('expireAt')
          if (!expireAt) return <span className="text-muted-foreground">永久</span>
          return (
            <span className={`tabular-nums ${isExpiringSoon(expireAt) ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
              {expireAt}
              {isExpiringSoon(expireAt) && ' · 即将到期'}
            </span>
          )
        }
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="状态" />,
        cell: ({ row }) => {
          const status = row.getValue<Tenant['status']>('status')
          return <StatusBadge ok={status === '正常'} label={status} />
        },
        filterFn: (row, id, value) => row.getValue(id) === value
      },
      {
        accessorKey: 'remark',
        header: '备注',
        enableSorting: false,
        cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('remark')}</span>
      },
      {
        id: 'actions',
        header: () => <div className="text-end">操作</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="text-end whitespace-nowrap">
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleProvision(row.original)}
                disabled={provisioning !== null}
                title="初始化默认角色"
              >
                <KeyRound className="size-4" />
                <span className="sr-only">初始化默认角色</span>
              </Button>
            )}
            {canAssign && (
              <Button variant="ghost" size="icon" onClick={() => setAssigning(row.original)} title="分配用户">
                <Users className="size-4" />
                <span className="sr-only">分配用户</span>
              </Button>
            )}
            {canEdit && (
              <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}>
                <Pencil className="size-4" />
                <span className="sr-only">编辑</span>
              </Button>
            )}
            {canDelete && (
              <Button variant="ghost" size="icon" onClick={() => setDeleting(row.original)}>
                <Trash2 className="text-destructive size-4" />
                <span className="sr-only">删除</span>
              </Button>
            )}
          </div>
        )
      }
    ],
    [canAssign, canEdit, canDelete, handleProvision, provisioning]
  )

  const columnFilters = useMemo(() => (statusFilter === 'all' ? [] : [{ id: 'status', value: statusFilter }]), [statusFilter])
  const { table, keyword, setKeyword } = useDataTable({ data: tenants, columns, columnFilters, hiddenColumns: HIDDEN_COLUMNS })

  const handleSubmit = (values: Omit<Tenant, 'id' | 'userCount'>) => {
    setSaving(true)
    const action = editing ? updateTenant(editing.id, values) : createTenant(values)
    action
      .then(() => {
        toast.success(editing ? '租户已更新' : '租户已创建')
        setFormOpen(false)
        load()
      })
      .catch(error => toast.error(error instanceof Error ? error.message : '保存失败'))
      .finally(() => setSaving(false))
  }

  const handleDelete = () => {
    if (!deleting) return
    setSaving(true)
    deleteTenant(deleting.id)
      .then(() => {
        toast.success(`已删除租户「${deleting.name}」`)
        setDeleting(null)
        load()
      })
      .catch(error => toast.error(error instanceof Error ? error.message : '删除失败'))
      .finally(() => setSaving(false))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">租户管理</h1>
          <p className="text-muted-foreground text-sm">
            共 {tenants.length} 个租户 · 新建租户会自动生成管理员/编辑者/访客三个角色 · 切换租户后只看到该租户的部门/角色/字典/公告/任务/文件
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" onClick={handleProvisionAll} disabled={provisioning !== null}>
              <RefreshCw className={provisioning === 'all' ? 'animate-spin' : undefined} />
              同步全部角色
            </Button>
          )}
          {canAdd && (
            <Button onClick={openCreate}>
              <Plus />
              新增租户
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
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            {error.unavailable ? (
              <WifiOff className="text-muted-foreground size-8" strokeWidth={1.5} />
            ) : (
              <CircleAlert className="text-muted-foreground size-8" strokeWidth={1.5} />
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium">{error.message}</p>
              <p className="text-muted-foreground text-xs">
                {error.unavailable ? '请确认网络正常；如果多次重试仍然失败，请联系管理员检查服务状态' : '可以重试，或联系管理员确认数据是否正确'}
              </p>
            </div>
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
                <Input placeholder="搜索名称 / 编码 / 联系人" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
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

            <DataTable table={table} emptyText="没有匹配的租户" />
            <DataTablePagination table={table} />
          </CardContent>
        </Card>
      )}

      {formOpen && (
        <TenantFormDialog key={editing?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} tenant={editing} submitting={saving} onSubmit={handleSubmit} />
      )}

      {assigning && <TenantUserDialog tenant={assigning} open onOpenChange={open => !open && setAssigning(null)} onSaved={load} />}

      <ConfirmDialog
        confirmText="删除"
        loading={saving}
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除租户「{deleting?.name}」。租户下还有用户时会被拒绝，需先在「分配用户」里清空成员。</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}
