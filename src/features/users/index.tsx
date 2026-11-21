import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Archive,
  BadgeCheck,
  Building2,
  ChevronRight,
  Droplets,
  Download,
  FileClock,
  KeyRound,
  LogOut,
  MoreHorizontal,
  Network,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  ShieldBan,
  ShieldCheck,
  Trash2,
  Unlock,
  Upload,
  UserCog,
  Users
} from 'lucide-react'
import { toast } from 'sonner'
import { useFeature } from '@/lib/features'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { RefreshButton } from '@/components/ui/refresh-button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { StatusBadge } from '@/components/status-badge'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useServerTable, type ServerTableQuery } from '@/components/data-table'
import { getUsername, hasPermission } from '@/lib/auth'
import { UserFormDrawer } from './components/user-form-drawer'
import { UserWatermarkDialog } from './components/user-watermark-dialog'
import { UserVipDialog } from './components/user-vip-dialog'
import { ResetPasswordResultDialog } from './components/reset-password-result-dialog'
import { RecycleBinDialog } from './components/recycle-bin-dialog'
import { saveBlobFile } from '@/lib/download'
import { UserImportDialog } from './components/user-import-dialog'
import { UserLoginLogDialog } from './components/user-login-log-dialog'
import { BatchRolesDialog } from './components/batch-roles-dialog'
import { SuperviseDeptsDialog } from './components/supervise-depts-dialog'
import { BATCH_WATERMARK_MODE_LABEL, BatchWatermarkDialog } from './components/batch-watermark-dialog'
import {
  batchAssignRoles,
  batchUpdateUsersStatus,
  batchUpdateUsersWatermark,
  clearUserPermissionCache,
  createUser,
  deleteUser,
  deleteUsers,
  exportUsers,
  fetchUserPage,
  forceOfflineUser,
  resetUserAvatar,
  resetUserPassword,
  setUserPlatformAdmin,
  unlockUser,
  updateUser,
  updateUserStatus,
  userStatusMap,
  type BatchWatermarkMode,
  type User,
  type UserWritePayload
} from './api'
import { withOperationLog } from '@/features/system/log/api'
import { fetchDepts, type Dept } from '@/features/system/dept/api'
import { toastBatchResult } from '@/lib/batch-delete'
import { cn } from 'cn'

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

interface DeptNode extends Dept {
  children: DeptNode[]
}

/** 按 parentId 组部门树（接口返回扁平列表，parentId 为 null 为顶级） */
function buildDeptTree(depts: Dept[]): DeptNode[] {
  const nodes = new Map<string, DeptNode>(depts.map(d => [d.id, { ...d, children: [] }]))
  const roots: DeptNode[] = []
  for (const d of depts) {
    const node = nodes.get(d.id)
    if (!node) continue
    const parent = d.parentId ? nodes.get(d.parentId) : undefined
    if (parent && parent.id !== d.id) parent.children.push(node)
    else roots.push(node)
  }
  const sortRecursive = (list: DeptNode[]) => {
    list.sort((a, b) => a.departOrder - b.departOrder)
    list.forEach(n => sortRecursive(n.children))
  }
  sortRecursive(roots)
  return roots
}

/** 收集部门自身 + 全部子孙部门 id（选中父部门时把子部门的人也查出来，一次 deptIds 并集查询） */
function collectSubtreeIds(node: DeptNode, acc: string[] = []): string[] {
  acc.push(node.id)
  node.children.forEach(child => collectSubtreeIds(child, acc))
  return acc
}

/** 左侧部门树单行 */
function DeptTreeRow({
  node,
  depth,
  collapsed,
  selectedId,
  onToggle,
  onSelect,
  onAddUser,
  canAdd
}: {
  node: DeptNode
  depth: number
  collapsed: Set<string>
  selectedId: string | null
  onToggle: (id: string) => void
  onSelect: (dept: Dept) => void
  onAddUser: (deptId: string) => void
  canAdd: boolean
}) {
  const hasChildren = node.children.length > 0
  const isCollapsed = collapsed.has(node.id)
  const selected = selectedId === node.id
  return (
    <div>
      <div
        className={cn(
          'hover:bg-accent group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm',
          selected && 'bg-accent font-medium'
        )}
        style={{ paddingInlineStart: depth * 16 + 8 }}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button
            type="button"
            className="hover:bg-muted -ms-1 flex size-5 items-center justify-center rounded"
            onClick={e => {
              e.stopPropagation()
              onToggle(node.id)
            }}
            aria-label={isCollapsed ? '展开' : '收起'}
          >
            <ChevronRight className={cn('size-3.5 transition-transform', !isCollapsed && 'rotate-90')} />
          </button>
        ) : (
          <span className="size-5" />
        )}
        <Building2 className="text-muted-foreground size-3.5 shrink-0" />
        <span className="truncate">{node.departName}</span>
        {canAdd && (
          <Button
            variant="ghost"
            size="icon"
            title="在该部门下新增用户"
            aria-label={`在「${node.departName}」下新增用户`}
            className="ms-auto size-6 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={e => {
              e.stopPropagation()
              onAddUser(node.id)
            }}
          >
            <Plus className="size-3.5" />
          </Button>
        )}
      </div>
      {!isCollapsed &&
        hasChildren &&
        node.children.map(child => (
          <DeptTreeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            collapsed={collapsed}
            selectedId={selectedId}
            onToggle={onToggle}
            onSelect={onSelect}
            onAddUser={onAddUser}
            canAdd={canAdd}
          />
        ))}
    </div>
  )
}

export function UsersPage() {
  /** 状态筛选：交给接口（serverStatus 为空串表示不筛） */
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  /** 新增用户时要默认带上的部门（左树选中/行内 + 按钮），undefined = 不带 */
  const [createDeptIds, setCreateDeptIds] = useState<string[] | undefined>(undefined)
  const [editing, setEditing] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)
  const [watermarkTarget, setWatermarkTarget] = useState<User | null>(null)
  const [vipTarget, setVipTarget] = useState<User | null>(null)
  const [superviseTarget, setSuperviseTarget] = useState<User | null>(null)
  // 特性开关（GET /v1/features，租户视角）：监管部门能力可按租户关闭
  const superviseDeptEnabled = useFeature('rbac.superviseDept')
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
  /** 批量水印弹窗开关（目标用户取当前勾选行） */
  const [batchWatermarkOpen, setBatchWatermarkOpen] = useState(false)
  /** 批量启停确认框：非空时待执行 */
  const [batchStatusTarget, setBatchStatusTarget] = useState<1 | 2 | null>(null)

  /* ---------- 左侧部门树（可选过滤器：不选 = 查全部；接口失败/无部门时整块隐藏降级为单列表格） ---------- */
  const [depts, setDepts] = useState<Dept[] | null>(null)
  const [deptKeyword, setDeptKeyword] = useState('')
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null)
  const [deptCollapsed, setDeptCollapsed] = useState<Set<string>>(new Set())

  useEffect(() => {
    // 部门树是增强能力不是依赖：拉不到就静默降级，用户管理页依然可用
    fetchDepts()
      .then(setDepts)
      .catch(() => setDepts([]))
  }, [])

  const deptTree = useMemo(() => (depts ? buildDeptTree(depts) : []), [depts])
  const deptById = useMemo(() => new Map((depts ?? []).map(d => [d.id, d])), [depts])
  /** 选中的部门已不存在（被删/被筛掉）时回退到「全部部门」，避免右侧停在过期过滤上 */
  useEffect(() => {
    if (depts && selectedDeptId && !deptById.has(selectedDeptId)) setSelectedDeptId(null)
  }, [depts, deptById, selectedDeptId])

  const selectedDept = selectedDeptId ? (deptById.get(selectedDeptId) ?? null) : null
  /** 选中部门 → 本部门 + 子孙部门 id 并集（后端 deptIds 过滤命中任一部门即返回） */
  const selectedDeptIds = useMemo(() => {
    if (!selectedDept) return []
    const node = deptTree.flatMap(root => (root.id === selectedDept.id ? [root] : [])).find(Boolean)
    if (node) return collectSubtreeIds(node)
    // 树里找不到（理论不可达）时兜底只过滤本部门
    return [selectedDept.id]
  }, [selectedDept, deptTree])

  /** 部门搜索：命中名称的过滤（命中节点及其祖先链保留展开） */
  const deptSearching = deptKeyword.trim() !== ''
  const visibleDeptTree = useMemo(() => {
    if (!deptSearching) return deptTree
    const kw = deptKeyword.trim().toLowerCase()
    const filterTree = (nodes: DeptNode[]): DeptNode[] =>
      nodes
        .map(node => {
          const children = filterTree(node.children)
          if (node.departName.toLowerCase().includes(kw) || children.length) return { ...node, children }
          return null
        })
        .filter((n): n is DeptNode => n != null)
    return filterTree(deptTree)
  }, [deptTree, deptSearching, deptKeyword])

  const toggleDept = (id: string) =>
    setDeptCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  /** 列表查询：翻页/搜索/排序/状态/部门都由接口完成，前端只维护查询参数 */
  const fetchPage = useCallback(
    ({ page, pageSize, keyword, filters, sortBy, sortOrder }: ServerTableQuery<{ status: string; deptIds: string }>) =>
      fetchUserPage({
        page,
        pageSize,
        keyword,
        status: filters.status,
        deptIds: filters.deptIds ? filters.deptIds.split(',').filter(Boolean) : undefined,
        sortBy,
        sortOrder
      }),
    []
  )

  const tableFilters = useMemo(
    () => ({
      status: statusFilter === 'all' ? '' : statusFilter,
      deptIds: selectedDeptIds.join(',')
    }),
    [statusFilter, selectedDeptIds]
  )

  const openCreate = (deptId?: string) => {
    setEditing(null)
    setCreateDeptIds(deptId ? [deptId] : selectedDept ? selectedDeptIds : undefined)
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
        cell: ({ row }) => (
          // 用内联徽标而不是单开一列：平台管理员通常只有一两个，加列会把表格再挤宽 80px
          <span className="flex items-center gap-1.5 font-medium whitespace-nowrap">
            {row.getValue('username')}
            {Number(row.original.isPlatformAdmin) === 1 && (
              <span
                className="inline-flex rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] leading-none font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                title="平台管理员：可跨租户视角、可访问平台级功能"
              >
                平台
              </span>
            )}
            {Number(row.original.vipLevel) === 1 && (
              <span
                className="inline-flex rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] leading-none font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                title="VIP：可自助开通团队（租户）"
              >
                VIP
              </span>
            )}
          </span>
        )
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
          const meta = userStatusMap[status] ?? { label: String(status) }
          return <StatusBadge ok={status === 1} label={meta.label} />
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
        id: 'levelName',
        accessorFn: row => row.level?.levelName ?? '',
        header: ({ column }) => <DataTableColumnHeader column={column} title="职级" />,
        cell: ({ row }) => row.getValue('levelName') || '-'
      },
      {
        id: 'postNames',
        accessorFn: row => (row.posts ?? []).map(p => p.postName || p.postCode).join('、'),
        header: ({ column }) => <DataTableColumnHeader column={column} title="岗位" />,
        cell: ({ row }) => row.getValue('postNames') || '-'
      },
      {
        id: 'deptNames',
        accessorFn: row => (row.depts ?? []).map(d => d.departName).join('、'),
        header: ({ column }) => <DataTableColumnHeader column={column} title="部门" />,
        cell: ({ row }) => row.getValue('deptNames') || '-'
      },
      {
        id: 'watermark',
        accessorFn: row => (row.watermarkEffective ? '已开启' : '已关闭'),
        header: ({ column }) => <DataTableColumnHeader column={column} title="水印" />,
        cell: ({ row }) => {
          const user = row.original
          const enforcedLabel = user.watermarkEnforced === 1 ? '（强制开）' : user.watermarkEnforced === 2 ? '（强制关）' : ''
          const effective = user.watermarkEffective === true
          return <StatusBadge ok={effective} label={`${effective ? '已开启' : '已关闭'}${enforcedLabel}`} />
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
                          .finally(() => reload())
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
                  {/* 管辖部门（ReBAC 监管数据权限）：data_scope 部门档的用户额外可见所选部门的数据；
                      特性开关 rbac.superviseDept 关闭的租户直接隐藏入口（后端 FeatureGuard 同步拦截） */}
                  {hasPermission('system:user:update') && superviseDeptEnabled && (
                    <DropdownMenuItem onClick={() => setSuperviseTarget(user)}>
                      <Network className="size-4" />
                      管辖部门
                    </DropdownMenuItem>
                  )}
                  {/* 平台级操作：权限点 scope=platform，后端还会拒绝取消自己/最后一个，所以自己那一行不显示 */}
                  {hasPermission('system:user:platform') && user.username !== getUsername() && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handlePlatformAdmin(user)}>
                        <ShieldCheck className="size-4" />
                        {Number(user.isPlatformAdmin) === 1 ? '取消平台管理员' : '设为平台管理员'}
                      </DropdownMenuItem>
                    </>
                  )}
                  {/* VIP 同样是平台级操作：决定该账号能否自助开通团队，租户管理员无权发放 */}
                  {hasPermission('system:user:vip') && (
                    <DropdownMenuItem onClick={() => setVipTarget(user)}>
                      <BadgeCheck className="size-4" />
                      {Number(user.vipLevel) === 1 ? '调整 VIP' : '开通 VIP'}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 列定义引用的是渲染期调用的 handler（闭包取最新值），不需要随函数标识重建
    []
  )

  const statusItems = useMemo(() => ({ all: '全部状态', ...Object.fromEntries(Object.entries(userStatusMap).map(([value, { label }]) => [value, label])) }), [])
  const { table, keyword, setKeyword, loading, booted, error, total, reload, rowSelection, setRowSelection } = useServerTable({
    columns,
    query: fetchPage,
    filters: tableFilters,
    getRowId: user => user.id
  })
  /** 当前页行数（导出按钮的可用性判断用，不能用 total —— 空搜索时 total 可能是 0 但列表有行） */
  const pageRows = table.getRowModel().rows
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
      reload()
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
        reload()
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
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '批量分配失败')
    }
  }

  /** 批量水印：三档成品动作（强制开/强制关/跟随全局），单条失败不阻断并回传跳过原因 */
  const handleBatchWatermark = async (ids: string[], mode: BatchWatermarkMode) => {
    try {
      const result = await withOperationLog(`批量${BATCH_WATERMARK_MODE_LABEL[mode]} ${ids.length} 个用户`, () => batchUpdateUsersWatermark(ids, mode))
      if (result.updated > 0) {
        toast.success(`已为 ${result.updated} 个用户${BATCH_WATERMARK_MODE_LABEL[mode]}，用户刷新页面后生效`)
      } else {
        toast.error('没有用户被更新')
      }
      result.skipped?.forEach(item => toast.warning(`已跳过 ${item.id}：${item.reason}`))
      setBatchWatermarkOpen(false)
      setRowSelection({})
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '批量水印设置失败')
    }
  }

  const handleSubmit = (values: UserWritePayload) => {
    const request = editing ? withOperationLog('更新用户', () => updateUser(editing.id, values)) : withOperationLog('新增用户', () => createUser(values))
    request
      .then(() => {
        toast.success(editing ? '用户已更新' : '用户已创建')
        setFormOpen(false)
        reload()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '保存失败'))
  }

  /** 导出 Excel：与列表同过滤条件（关键字/状态/部门），导出的是筛选后的结果（不筛选即全量） */
  const handleExport = () => {
    setExporting(true)
    exportUsers({
      keyword: keyword.trim(),
      status: statusFilter === 'all' ? '' : statusFilter,
      deptIds: selectedDeptIds.length ? selectedDeptIds : undefined
    })
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
        reload()
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

  /** 授予/取消平台管理员：平台级操作，后端拒绝取消自己与最后一个；改完 alert 提示 30s 内生效 */
  const handlePlatformAdmin = (user: User) => {
    const next = Number(user.isPlatformAdmin) !== 1
    withOperationLog(`${next ? '授予' : '取消'}用户「${user.realname || user.username}」的平台管理员`, () => setUserPlatformAdmin(user.id, next))
      .then(() => {
        toast.success(next ? `已授予「${user.username}」平台管理员，最多 30 秒生效` : `已取消「${user.username}」的平台管理员权限`)
        reload()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '操作失败'))
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
      .finally(() => reload())
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

  /** 部门树刷新（保持与左侧树的加载态一致：null = 骨架屏） */
  const reloadDepts = useCallback(() => {
    setDepts(null)
    fetchDepts()
      .then(setDepts)
      .catch(() => setDepts([]))
  }, [])

  return (
    <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
      {/* 左：部门树 —— 可选过滤器，不选 = 查全部；无部门/接口失败时整块隐藏，降级为单列表格 */}
      {depts === null ? (
        <Card className="h-fit xl:sticky xl:top-4">
          <div className="px-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-3 h-8 w-full" />
          </div>
          <CardContent className="space-y-2 px-3 pt-3 pb-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : depts.length === 0 ? null : (
        <Card className="h-fit xl:sticky xl:top-4">
          <div className="flex items-center justify-between px-3">
            <span className="text-sm font-semibold">部门</span>
            <RefreshButton onClick={reloadDepts} className="size-7" spinning={depts === null} />
          </div>
          <div className="px-3 pt-2 pb-1">
            <Input placeholder="搜索部门名称" className="h-8 text-sm" value={deptKeyword} onChange={e => setDeptKeyword(e.target.value)} />
          </div>
          {/* data-scroll：滚动条默认隐藏、悬停显现，与侧边栏一致；偏移量与 system/menu 左树保持一致（两页卡片结构相同） */}
          <CardContent data-scroll="tree" className="max-h-[calc(100vh-260px)] overflow-y-auto px-2 pb-2">
            <div className="py-1">
              {/* 虚拟根节点：不选部门 = 不过滤（游客模式/游离账号都能看全量） */}
              <button
                type="button"
                className={cn(
                  'hover:bg-accent flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-start text-sm',
                  !selectedDeptId && 'bg-accent font-medium'
                )}
                onClick={() => setSelectedDeptId(null)}
              >
                <Users className="text-muted-foreground size-3.5 shrink-0" />
                全部部门
              </button>
              {visibleDeptTree.map(node => (
                <DeptTreeRow
                  key={node.id}
                  node={node}
                  depth={1}
                  collapsed={deptCollapsed}
                  selectedId={selectedDeptId}
                  onToggle={toggleDept}
                  onSelect={dept => setSelectedDeptId(dept.id)}
                  onAddUser={deptId => openCreate(deptId)}
                  canAdd={hasPermission('system:user:add')}
                />
              ))}
              {visibleDeptTree.length === 0 && deptSearching && (
                <p className="text-muted-foreground py-6 text-center text-sm">没有匹配的部门</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 右：标题 + 用户表格（部门树隐藏时自动占满整行） */}
      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">用户管理</h1>
            <p className="text-muted-foreground text-sm">
              {/* 服务端分页后会拿到真实总数；total=-1 说明本次跳过了 COUNT，只能报「当前页 N 条」 */}
              {total >= 0 ? `共 ${total} 个用户` : `当前页 ${pageRows.length} 个用户`}
              {selectedDept && ` · 「${selectedDept.departName}」及下级`}
            </p>
          </div>
        <div className="flex flex-wrap gap-2">
          {hasPermission('system:user:export') && (
            <Button variant="outline" onClick={handleExport} disabled={exporting || pageRows.length === 0}>
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
              <Button variant="outline" onClick={() => setBatchWatermarkOpen(true)} disabled={batchBusy}>
                <Droplets />
                批量水印（{selectedCount}）
              </Button>
            </>
          )}
          {hasPermission('system:user:add') && (
            <Button
              onClick={() => {
                setCreateDeptIds(selectedDept ? selectedDeptIds : undefined)
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus />
              新增用户
            </Button>
          )}
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
              <RefreshButton onClick={() => void reload()} className="ms-auto" />
              <DataTableViewOptions table={table} columnLabels={columnLabels} />
            </div>

            <DataTable table={table} loading={loading} emptyText="没有匹配的用户" />
            <DataTablePagination table={table} />
          </CardContent>
        </Card>
      )}

      </div>

      {formOpen && (
        <UserFormDrawer
          key={`${editing?.id ?? 'new'}-${(createDeptIds ?? []).join(',')}`}
          open={formOpen}
          onOpenChange={setFormOpen}
          user={editing}
          defaultDeptIds={createDeptIds}
          onSubmit={handleSubmit}
        />
      )}

      {importOpen && <UserImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={reload} />}

      {watermarkTarget && (
        <UserWatermarkDialog
          key={watermarkTarget.id}
          open={!!watermarkTarget}
          onOpenChange={v => !v && setWatermarkTarget(null)}
          user={watermarkTarget}
          onSaved={() => {
            toast.success(`已更新「${watermarkTarget.realname || watermarkTarget.username}」的水印设置`)
            reload()
          }}
        />
      )}

      {vipTarget && (
        <UserVipDialog
          key={vipTarget.id}
          open={!!vipTarget}
          onOpenChange={v => !v && setVipTarget(null)}
          user={vipTarget}
          onSaved={reload}
        />
      )}

      {superviseTarget && (
        <SuperviseDeptsDialog
          key={superviseTarget.id}
          open={!!superviseTarget}
          onOpenChange={v => !v && setSuperviseTarget(null)}
          user={superviseTarget}
          onSaved={reload}
        />
      )}

      <ConfirmDialog
        confirmText="删除"
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除用户「{deleting?.realname || deleting?.username}」，该操作为软删除，可在「回收站」恢复。</>}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        confirmText="删除"
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

      <ConfirmDialog
        confirmText={statusTarget?.next === 2 ? '冻结' : '解冻'}
        confirmVariant={statusTarget?.next === 2 ? 'destructive' : 'default'}
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

      <ConfirmDialog
        confirmText="强制下线"
        open={!!kickTarget}
        onOpenChange={v => !v && setKickTarget(null)}
        title="确认强制下线？"
        description={<>即将把用户「{kickTarget?.realname || kickTarget?.username}」的全部在线会话踢下线，其令牌立即失效，可重新登录。</>}
        onConfirm={handleKick}
      />

      <RecycleBinDialog open={recycleOpen} onOpenChange={setRecycleOpen} onRestored={reload} />

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

      {batchWatermarkOpen && selectedCount > 0 && (
        <BatchWatermarkDialog
          open={batchWatermarkOpen}
          onOpenChange={v => {
            if (!v) setBatchWatermarkOpen(false)
          }}
          targets={table.getSelectedRowModel().rows.map(row => row.original)}
          onSubmit={handleBatchWatermark}
        />
      )}

      <ConfirmDialog
        confirmText={batchStatusTarget === 2 ? '停用' : '启用'}
        confirmVariant={batchStatusTarget === 2 ? 'destructive' : 'default'}
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
