import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  Droplets,
  Download,
  FileClock,
  KeyRound,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  ShieldBan,
  ShieldCheck,
  Trash2,
  Unlock,
  Upload,
  UserCog
} from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useDataTable } from '@/components/data-table'
import { hasPermission } from '@/lib/auth'
import { UserFormDialog } from './components/user-form-dialog'
import { UserWatermarkDialog } from './components/user-watermark-dialog'
import { ResetPasswordResultDialog } from './components/reset-password-result-dialog'
import { RecycleBinDialog } from './components/recycle-bin-dialog'
import { saveBlobFile } from '@/lib/download'
import { UserImportDialog } from './components/user-import-dialog'
import { UserLoginLogDialog } from './components/user-login-log-dialog'
import { BatchRolesDialog } from './components/batch-roles-dialog'
import {
  batchAssignRoles,
  batchUpdateUsersStatus,
  clearUserPermissionCache,
  createUser,
  deleteUser,
  deleteUsers,
  exportUsers,
  fetchUsers,
  forceOfflineUser,
  resetUserAvatar,
  resetUserPassword,
  unlockUser,
  updateUser,
  updateUserStatus,
  userStatusMap,
  type User,
  type UserWritePayload
} from './api'
import { withOperationLog } from '@/features/system/log/api'
import { toastBatchResult } from '@/lib/batch-delete'

const columnLabels: Record<string, string> = {
  username: '账号',
  realname: '姓名',
  email: '邮箱',
  phone: '手机号',
  status: '状态',
  roleNames: '角色',
  postNames: '岗位',
  watermark: '水印',
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
  const [watermarkTarget, setWatermarkTarget] = useState<User | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  /** 重置密码结果：非空时弹一次性明文展示框 */
  const [resetResult, setResetResult] = useState<{ username: string; password: string } | null>(null)
  /** 冻结/解冻二次确认目标 */
  const [statusTarget, setStatusTarget] = useState<{ user: User; next: 1 | 2 } | null>(null)
  /** 强制下线二次确认目标 */
  const [kickTarget, setKickTarget] = useState<User | null>(null)
  const [recycleOpen, setRecycleOpen] = useState(false)
  /** 登录日志弹窗目标（按用户过滤） */
  const [logTarget, setLogTarget] = useState<User | null>(null)
  /** 批量分配角色弹窗开关（目标用户取当前勾选行） */
  const [batchRolesOpen, setBatchRolesOpen] = useState(false)
  /** 批量启停确认框：非空时待执行 */
  const [batchStatusTarget, setBatchStatusTarget] = useState<1 | 2 | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchUsers()
      .then(res => {
        setList(res.records ?? [])
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
        id: 'postNames',
        accessorFn: row => (row.posts ?? []).map(p => p.postName || p.postCode).join('、'),
        header: ({ column }) => <DataTableColumnHeader column={column} title="岗位" />,
        cell: ({ row }) => row.getValue('postNames') || '-'
      },
      {
        id: 'watermark',
        accessorFn: row => (row.watermarkEffective ? '已开启' : '已关闭'),
        header: ({ column }) => <DataTableColumnHeader column={column} title="水印" />,
        cell: ({ row }) => {
          const user = row.original
          const enforcedLabel = user.watermarkEnforced === 1 ? '（强制开）' : user.watermarkEnforced === 2 ? '（强制关）' : ''
          return (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${user.watermarkEffective ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}
            >
              {user.watermarkEffective ? '已开启' : '已关闭'}
              {enforcedLabel}
            </span>
          )
        }
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
        cell: ({ row }) => {
          const user = row.original
          const frozen = user.status === 2
          return (
            <div className="flex items-center justify-end">
              {hasPermission('system:user:update') && (
                <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                  <Pencil className="size-4" />
                  <span className="sr-only">编辑</span>
                </Button>
              )}
              {hasPermission('system:user:update') && (
                <Button variant="ghost" size="icon" onClick={() => setWatermarkTarget(user)} title="水印设置">
                  <Droplets className="size-4" />
                  <span className="sr-only">水印设置</span>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" title="更多操作">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">更多操作</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {hasPermission('system:user:reset-password') && (
                    <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                      <KeyRound className="size-4" />
                      重置密码
                    </DropdownMenuItem>
                  )}
                  {hasPermission('system:user:update') && (
                    <DropdownMenuItem onClick={() => setStatusTarget({ user, next: frozen ? 1 : 2 })}>
                      {frozen ? <ShieldCheck className="size-4" /> : <ShieldBan className="size-4" />}
                      {frozen ? '解冻' : '冻结'}
                    </DropdownMenuItem>
                  )}
                  {hasPermission('system:online:kick') && (
                    <DropdownMenuItem onClick={() => setKickTarget(user)}>
                      <LogOut className="size-4" />
                      强制下线
                    </DropdownMenuItem>
                  )}
                  {hasPermission('system:user:update') && (
                    <DropdownMenuItem onClick={() => handleUnlock(user)}>
                      <Unlock className="size-4" />
                      解锁登录
                    </DropdownMenuItem>
                  )}
                  {hasPermission('system:user:update') && (
                    <DropdownMenuItem
                      onClick={() =>
                        withOperationLog(`清除用户「${user.realname || user.username}」的权限缓存`, () => clearUserPermissionCache(user.id))
                          .then(result => toast.success(`已清除 ${result.cleared} 个角色的权限缓存，下次操作即生效`))
                          .catch(e => toast.error(e instanceof Error ? e.message : '清除失败'))
                      }
                    >
                      <RefreshCcw className="size-4" />
                      清除权限缓存
                    </DropdownMenuItem>
                  )}
                  {hasPermission('system:user:update') && (
                    <DropdownMenuItem
                      onClick={() =>
                        withOperationLog(`重置用户「${user.realname || user.username}」的头像`, () => resetUserAvatar(user.id))
                          .then(() => toast.success('头像已重置为系统默认'))
                          .catch(e => toast.error(e instanceof Error ? e.message : '重置失败'))
                          .finally(() => load())
                      }
                    >
                      <UserCog className="size-4" />
                      重置头像
                    </DropdownMenuItem>
                  )}
                  {hasPermission('system:log:login') && (
                    <DropdownMenuItem onClick={() => setLogTarget(user)}>
                      <FileClock className="size-4" />
                      登录日志
                    </DropdownMenuItem>
                  )}
                  {hasPermission('system:user:delete') && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleting(user)}>
                        <Trash2 className="size-4" />
                        删除
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        }
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
      const result = await withOperationLog(`批量删除 ${targets.length} 个用户`, () => deleteUsers(targets.map(user => user.id)))
      toastBatchResult(result, '用户')
      setBatchDeleting(false)
      setRowSelection({})
      load()
    } finally {
      setBatchBusy(false)
    }
  }

  /** 批量启用/停用：复用单条规则（admin 跳过、停用踢会话），逐条返回跳过原因 */
  const handleBatchStatus = (next: 1 | 2) => {
    const targets = table.getSelectedRowModel().rows.map(row => row.original)
    if (!targets.length) return
    setBatchBusy(true)
    withOperationLog(`批量${next === 2 ? '停用' : '启用'} ${targets.length} 个用户`, () =>
      batchUpdateUsersStatus(targets.map(user => user.id), next, '管理员批量操作')
    )
      .then(result => {
        toast.success(
          `已${next === 2 ? '停用' : '启用'} ${result.updated} 个用户${result.kicked ? `，强制下线 ${result.kicked} 个在线会话` : ''}`
        )
        result.skipped?.forEach(item => toast.warning(`「${item.username}」已跳过：${item.reason}`))
        setRowSelection({})
        setBatchStatusTarget(null)
        load()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '批量操作失败'))
      .finally(() => setBatchBusy(false))
  }

  /** 批量分配角色提交 */
  const handleBatchRoles = async (ids: string[], roleIds: string[]) => {
    try {
      const result = await withOperationLog(`为 ${ids.length} 个用户批量分配角色`, () => batchAssignRoles(ids, roleIds))
      toast.success(`已更新 ${result.updated} 个用户的角色`)
      setBatchRolesOpen(false)
      setRowSelection({})
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '批量分配失败')
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

  /** 导出 Excel：把当前搜索关键字与状态筛选带给后端，导出的是筛选后的结果（不筛选即全量） */
  const handleExport = () => {
    setExporting(true)
    exportUsers({ keyword: keyword.trim(), status: statusFilter === 'all' ? '' : statusFilter })
      .then(({ filename, blob }) => {
        saveBlobFile(filename, blob)
        toast.success('用户已导出')
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '导出失败'))
      .finally(() => setExporting(false))
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

  /** 重置密码：成功后弹一次性明文展示框（明文只在本次响应里，后端不落库） */
  const handleResetPassword = (user: User) => {
    withOperationLog(`重置用户「${user.realname || user.username}」的密码`, () => resetUserPassword(user.id))
      .then(result => setResetResult({ username: user.username, password: result.password }))
      .catch(e => toast.error(e instanceof Error ? e.message : '重置失败'))
  }

  /** 解锁登录：清零失败计数，幂等（未锁定时也提示成功无妨） */
  const handleUnlock = (user: User) => {
    withOperationLog(`解锁用户「${user.realname || user.username}」的登录`, () => unlockUser(user.id))
      .then(() => toast.success(`账号「${user.username}」已解锁`))
      .catch(e => toast.error(e instanceof Error ? e.message : '解锁失败'))
  }

  /** 冻结/解冻确认：冻结会踢掉该用户全部在线会话 */
  const handleStatusChange = () => {
    const target = statusTarget
    if (!target) return
    const { user, next } = target
    withOperationLog(`${next === 2 ? '冻结' : '解冻'}用户「${user.realname || user.username}」`, () => updateUserStatus(user.id, next))
      .then(result =>
        toast.success(
          next === 2 ? `已冻结「${user.username}」，并下线其 ${result.kicked} 个在线会话` : `已解冻「${user.username}」`
        )
      )
      .catch(e => toast.error(e instanceof Error ? e.message : '操作失败'))
      .finally(() => load())
    setStatusTarget(null)
  }

  /** 强制下线确认 */
  const handleKick = () => {
    if (!kickTarget) return
    const user = kickTarget
    withOperationLog(`强制下线用户「${user.realname || user.username}」`, () => forceOfflineUser(user.id))
      .then(result => toast.success(`已下线「${user.username}」的 ${result.kicked} 个在线会话`))
      .catch(e => toast.error(e instanceof Error ? e.message : '操作失败'))
    setKickTarget(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-muted-foreground text-sm">共 {total} 个用户</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPermission('system:user:export') && (
            <Button variant="outline" onClick={handleExport} disabled={exporting || users.length === 0}>
              <Download />
              {exporting ? '导出中…' : '导出'}
            </Button>
          )}
          {hasPermission('system:user:import') && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload />
              导入
            </Button>
          )}
          {hasPermission('system:user:restore') && (
            <Button variant="outline" onClick={() => setRecycleOpen(true)}>
              <Archive />
              回收站
            </Button>
          )}
          {hasPermission('system:user:delete') && selectedCount > 0 && (
            <Button variant="outline" onClick={() => setBatchDeleting(true)} disabled={batchBusy}>
              <Trash2 />
              批量删除（{selectedCount}）
            </Button>
          )}
          {hasPermission('system:user:update') && selectedCount > 0 && (
            <>
              <Button variant="outline" onClick={() => setBatchStatusTarget(1)} disabled={batchBusy}>
                <ShieldCheck />
                批量启用（{selectedCount}）
              </Button>
              <Button variant="outline" onClick={() => setBatchStatusTarget(2)} disabled={batchBusy}>
                <ShieldBan />
                批量停用（{selectedCount}）
              </Button>
              <Button variant="outline" onClick={() => setBatchRolesOpen(true)} disabled={batchBusy}>
                <UserCog />
                批量分配角色（{selectedCount}）
              </Button>
            </>
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

      {importOpen && <UserImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={load} />}

      {watermarkTarget && (
        <UserWatermarkDialog
          key={watermarkTarget.id}
          open={!!watermarkTarget}
          onOpenChange={v => !v && setWatermarkTarget(null)}
          user={watermarkTarget}
          onSaved={() => {
            toast.success(`已更新「${watermarkTarget.realname || watermarkTarget.username}」的水印设置`)
            load()
          }}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除用户「{deleting?.realname || deleting?.username}」，该操作为软删除，可在「回收站」恢复。</>}
        onConfirm={handleDelete}
      />

      <ConfirmDeleteDialog
        open={batchDeleting}
        onOpenChange={v => !batchBusy && setBatchDeleting(v)}
        title="批量删除用户"
        description={
          <>
            即将删除勾选的 {selectedCount} 个用户，该操作为软删除，可在「回收站」恢复。{batchBusy ? '正在删除，请稍候…' : ''}
          </>
        }
        onConfirm={handleBatchDelete}
      />

      <ResetPasswordResultDialog open={!!resetResult} onOpenChange={v => !v && setResetResult(null)} username={resetResult?.username} password={resetResult?.password} />

      <ConfirmDeleteDialog
        open={!!statusTarget}
        onOpenChange={v => !v && setStatusTarget(null)}
        title={statusTarget?.next === 2 ? '确认冻结该账号？' : '确认解冻该账号？'}
        description={
          statusTarget?.next === 2 ? (
            <>即将冻结用户「{statusTarget?.user.realname || statusTarget?.user.username}」：登录立即被拒，其全部在线会话将被强制下线。解冻可随时在此操作。</>
          ) : (
            <>即将解冻用户「{statusTarget?.user.realname || statusTarget?.user.username}」，解冻后可正常登录。</>
          )
        }
        onConfirm={handleStatusChange}
      />

      <ConfirmDeleteDialog
        open={!!kickTarget}
        onOpenChange={v => !v && setKickTarget(null)}
        title="确认强制下线？"
        description={<>即将把用户「{kickTarget?.realname || kickTarget?.username}」的全部在线会话踢下线，其令牌立即失效，可重新登录。</>}
        onConfirm={handleKick}
      />

      <RecycleBinDialog open={recycleOpen} onOpenChange={setRecycleOpen} onRestored={load} />

      {logTarget && (
        <UserLoginLogDialog key={logTarget.id} open={!!logTarget} onOpenChange={v => !v && setLogTarget(null)} user={logTarget} />
      )}

      {batchRolesOpen && selectedCount > 0 && (
        <BatchRolesDialog
          open={batchRolesOpen}
          onOpenChange={v => {
            if (!v) setBatchRolesOpen(false)
          }}
          targets={table.getSelectedRowModel().rows.map(row => row.original)}
          onSubmit={handleBatchRoles}
        />
      )}

      <ConfirmDeleteDialog
        open={!!batchStatusTarget}
        onOpenChange={v => {
          if (!batchBusy) setBatchStatusTarget(v ? batchStatusTarget : null)
        }}
        title={batchStatusTarget === 2 ? `确认批量停用 ${selectedCount} 个账号？` : `确认批量启用 ${selectedCount} 个账号？`}
        description={
          batchStatusTarget === 2 ? (
            <>停用后这些用户立即无法登录，全部在线会话将被强制下线；内置管理员会被自动跳过并在结果中说明。</>
          ) : (
            <>启用后这些用户可正常登录。</>
          )
        }
        onConfirm={() => batchStatusTarget && handleBatchStatus(batchStatusTarget)}
      />
    </div>
  )
}
