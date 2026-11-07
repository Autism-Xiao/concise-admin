import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, Pencil, Plus, Search, Trash2, Users, WifiOff } from 'lucide-react'
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
import { createTenant, deleteTenant, fetchTenants, updateTenant, type Tenant, type TenantPlan } from './api'

const columnLabels: Record<string, string> = {
  id: 'ID',
  name: '租户名称',
  code: '租户编码',
  contact: '联系人',
  phone: '联系电话',
  plan: '套餐',
  userCount: '用户数',
  expireAt: '到期日期',
  status: '状态',
  remark: '备注'
}

/** 到期日 30 天内高亮提醒 */
function isExpiringSoon(expireAt: string): boolean {
  if (!expireAt) return false
  const days = (new Date(expireAt).getTime() - Date.now()) / 86400000
  return days >= 0 && days <= 30
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
        accessorKey: 'contact',
        header: '联系人'
      },
      {
        accessorKey: 'phone',
        header: '联系电话',
        cell: ({ row }) => <span className="tabular-nums">{row.getValue('phone')}</span>
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
    [canAssign, canEdit, canDelete]
  )

  const columnFilters = useMemo(() => (statusFilter === 'all' ? [] : [{ id: 'status', value: statusFilter }]), [statusFilter])
  const { table, keyword, setKeyword } = useDataTable({ data: tenants, columns, columnFilters })

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
            共 {tenants.length} 个租户 · 切换租户后只看到该租户的部门/角色/字典/公告/任务/文件
          </p>
        </div>
        {canAdd && (
          <Button onClick={openCreate}>
            <Plus />
            新增租户
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
