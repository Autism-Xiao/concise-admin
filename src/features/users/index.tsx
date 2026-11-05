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
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useDataTable } from '@/components/data-table'
import { hasPermission } from '@/lib/auth'
import { UserFormDialog } from './components/user-form-dialog'
import { createUser, deleteUser, deleteUsers, fetchUsers, updateUser, userStatusMap, type User, type UserWritePayload } from './api'
import { withOperationLog } from '@/features/system/log/api'

const columnLabels: Record<string, string> = {
  username: '账号',
  realname: '姓名',
  email: '邮箱',
  phone: '手机号',
  status: '状态',
  roleNames: '角色',
  createTime: '创建时间'
}

export function UsersPage() {
  const [list, setList] = useState<User[] | null>(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchUsers()
      .then(res => {
        setList(res.items ?? [])
        setTotal(res.total ?? 0)
      })
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const users = useMemo(() => list ?? [], [list])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (user: User) => {
    setEditing(user)
    setFormOpen(true)
  }

  const columns = useMemo<ColumnDef<User>[]>(
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
            aria-label={`选择「${row.original.realname || row.original.username}」`}
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        enableSorting: false,
        enableHiding: false
      },
      {
        accessorKey: 'username',
        header: ({ column }) => <DataTableColumnHeader column={column} title="账号" />,
        cell: ({ row }) => <span className="font-medium">{row.getValue('username')}</span>
      },
      {
        accessorKey: 'realname',
        header: ({ column }) => <DataTableColumnHeader column={column} title="姓名" />,
        cell: ({ row }) => row.getValue('realname') || '-'
      },
      {
        accessorKey: 'email',
        header: ({ column }) => <DataTableColumnHeader column={column} title="邮箱" />,
        cell: ({ row }) => row.getValue('email') || '-'
      },
      {
        accessorKey: 'phone',
        header: '手机号',
        enableSorting: false,
        cell: ({ row }) => row.getValue('phone') || '-'
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="状态" />,
        cell: ({ row }) => {
          const status = row.getValue<number>('status')
          const meta = userStatusMap[status] ?? { label: String(status), className: 'bg-muted text-muted-foreground' }
          return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}>{meta.label}</span>
        },
        filterFn: (row, id, value) => String(row.getValue(id)) === String(value)
      },
      {
        id: 'roleNames',
        accessorFn: row => (row.roles ?? []).map(r => r.roleName).join('、'),
        header: ({ column }) => <DataTableColumnHeader column={column} title="角色" />,
        cell: ({ row }) => row.getValue('roleNames') || '-'
      },
      {
        accessorKey: 'createTime',
        header: ({ column }) => <DataTableColumnHeader column={column} title="创建时间" />,
        cell: ({ row }) => (row.getValue('createTime') as string)?.replace('T', ' ').slice(0, 19) || '-'
      },
      {
        id: 'actions',
        header: () => <div className="text-end">操作</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="text-end">
            {hasPermission('system:user:update') && (
              <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}>
                <Pencil className="size-4" />
                <span className="sr-only">编辑</span>
              </Button>
            )}
            {hasPermission('system:user:delete') && (
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
  const statusItems = useMemo(() => ({ all: '全部状态', ...Object.fromEntries(Object.entries(userStatusMap).map(([value, { label }]) => [value, label])) }), [])
  const { table, keyword, setKeyword, rowSelection, setRowSelection } = useDataTable({
    data: users,
    columns,
    columnFilters,
    getRowId: user => user.id
  })
  const selectedCount = Object.keys(rowSelection).filter(key => rowSelection[key]).length
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [batchBusy, setBatchBusy] = useState(false)

  const handleBatchDelete = async () => {
    const targets = table.getSelectedRowModel().rows.map(row => row.original)
    if (!targets.length || batchBusy) return
    setBatchBusy(true)
    try {
      const results = await withOperationLog(`批量删除 ${targets.length} 个用户`, () => deleteUsers(targets.map(user => user.id)))
      const succeeded = results.filter(result => result.status === 'fulfilled').length
      const failed = results.length - succeeded
      if (succeeded) toast.success(`已删除 ${succeeded} 个用户`)
      if (failed) toast.error(`${failed} 个用户删除失败，请检查是否包含不可删除的账号`)
      setBatchDeleting(false)
      setRowSelection({})
      load()
    } finally {
      setBatchBusy(false)
    }
  }

  const handleSubmit = (values: UserWritePayload) => {
    const request = editing ? withOperationLog('更新用户', () => updateUser(editing.id, values)) : withOperationLog('新增用户', () => createUser(values))
    request
      .then(() => {
        toast.success(editing ? '用户已更新' : '用户已创建')
        setFormOpen(false)
        load()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '保存失败'))
  }

  const handleDelete = () => {
    if (!deleting) return
    withOperationLog(`删除用户「${deleting.realname || deleting.username}」`, () => deleteUser(deleting.id))
      .then(() => {
        toast.success(`已删除用户「${deleting.realname || deleting.username}」`)
        load()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '删除失败'))
    setDeleting(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-muted-foreground text-sm">共 {total} 个用户</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPermission('system:user:delete') && selectedCount > 0 && (
            <Button variant="outline" onClick={() => setBatchDeleting(true)} disabled={batchBusy}>
              <Trash2 />
              批量删除（{selectedCount}）
            </Button>
          )}
          {hasPermission('system:user:add') && (
            <Button onClick={openCreate}>
              <Plus />
              新增用户
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
                <Input placeholder="搜索账号 / 姓名 / 手机号" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter} items={statusItems}>
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {Object.entries(userStatusMap).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DataTableViewOptions table={table} columnLabels={columnLabels} />
            </div>

            <DataTable table={table} emptyText="没有匹配的用户" />
            <DataTablePagination table={table} />
          </CardContent>
        </Card>
      )}

      {formOpen && <UserFormDialog key={editing?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} user={editing} onSubmit={handleSubmit} />}

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除用户「{deleting?.realname || deleting?.username}」，该操作为软删除，可联系管理员恢复。</>}
        onConfirm={handleDelete}
      />

      <ConfirmDeleteDialog
        open={batchDeleting}
        onOpenChange={v => !batchBusy && setBatchDeleting(v)}
        title="批量删除用户"
        description={
          <>
            即将删除勾选的 {selectedCount} 个用户，该操作为软删除，可联系管理员恢复。{batchBusy ? '正在删除，请稍候…' : ''}
          </>
        }
        onConfirm={handleBatchDelete}
      />
    </div>
  )
}
