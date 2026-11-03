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
import { UserFormDialog } from './components/user-form-dialog'
import { createAccountFor, deleteAccountFor, fetchUsers, saveUsers, updateAccountFor, type User, type UserStatus } from './api'

const statusMap: Record<UserStatus, { label: string; className: string }> = {
  active: { label: '活跃', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  inactive: { label: '未激活', className: 'bg-muted text-muted-foreground' },
  invited: { label: '已邀请', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  suspended: { label: '已停用', className: 'bg-destructive/15 text-destructive' }
}

const columnLabels: Record<string, string> = {
  id: 'ID',
  name: '姓名',
  username: '用户名',
  email: '邮箱',
  phone: '手机号',
  status: '状态',
  role: '角色',
  createdAt: '创建时间'
}

export function UsersPage() {
  const [list, setList] = useState<User[] | null>(null)
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
      .then(setList)
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
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
        cell: ({ row }) => row.getValue('id')
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="姓名" />,
        cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>
      },
      {
        accessorKey: 'username',
        header: ({ column }) => <DataTableColumnHeader column={column} title="用户名" />
      },
      {
        accessorKey: 'email',
        header: ({ column }) => <DataTableColumnHeader column={column} title="邮箱" />
      },
      {
        accessorKey: 'phone',
        header: '手机号',
        enableSorting: false
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="状态" />,
        cell: ({ row }) => {
          const status = row.getValue<UserStatus>('status')
          return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusMap[status].className}`}>{statusMap[status].label}</span>
        },
        filterFn: (row, id, value) => row.getValue(id) === value
      },
      {
        accessorKey: 'role',
        header: ({ column }) => <DataTableColumnHeader column={column} title="角色" />
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="创建时间" />
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
  const statusItems = useMemo(() => ({ all: '全部状态', ...Object.fromEntries(Object.entries(statusMap).map(([value, { label }]) => [value, label])) }), [])
  const { table, keyword, setKeyword } = useDataTable({ data: users, columns, columnFilters })

  /** 先写回 users.json，再同步登录账号；任一步失败回退重新加载 */
  const handleSubmit = (values: Omit<User, 'id' | 'createdAt'>) => {
    if (editing) {
      const nextUser: User = { ...editing, ...values }
      const next = users.map(u => (u.id === editing.id ? nextUser : u))
      setList(next)
      saveUsers(next)
        .then(() => updateAccountFor(editing, nextUser))
        .then(() => toast.success('用户已更新'))
        .catch(() => {
          toast.error('保存失败，已重新加载')
          load()
        })
    } else {
      const id = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1
      const nextUser: User = { ...values, id, createdAt: new Date().toISOString().slice(0, 10) }
      const next = [nextUser, ...users]
      setList(next)
      saveUsers(next)
        .then(() => createAccountFor(nextUser))
        .then(() => toast.success('用户已创建，登录初始密码 123456'))
        .catch(() => {
          toast.error('保存失败，已重新加载')
          load()
        })
    }
    setFormOpen(false)
  }

  const handleDelete = () => {
    if (!deleting) return
    const next = users.filter(u => u.id !== deleting.id)
    setList(next)
    saveUsers(next)
      .then(() => deleteAccountFor(deleting))
      .then(() => toast.success(`已删除用户「${deleting.name}」`))
      .catch(() => {
        toast.error('保存失败，已重新加载')
        load()
      })
    setDeleting(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-muted-foreground text-sm">共 {users.length} 个用户（mock 数据）</p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          新增用户
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
                <Input placeholder="搜索姓名 / 用户名 / 邮箱" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter} items={statusItems}>
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {Object.entries(statusMap).map(([value, { label }]) => (
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
        description={<>即将删除用户「{deleting?.name}」，该操作不可恢复。</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}
