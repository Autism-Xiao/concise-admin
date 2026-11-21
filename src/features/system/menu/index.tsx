import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronRight, Download, Folder, ListTree, MousePointerClick, PanelTop, Plus, SquarePen, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { RefreshButton } from '@/components/ui/refresh-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { StatusBadge } from '@/components/status-badge'
import { cn } from 'cn'
import { hasPermission } from '@/lib/auth'
import { saveBlobFile } from '@/lib/download'
import { MenuFormDialog } from './components/menu-form-dialog'
import { createMenu, deleteMenu, exportMenus, fetchMenus, menuTypeMap, savePermNodes, updateMenu, type Menu, type MenuWritePayload, type PermNode } from './api'
import { withOperationLog } from '@/features/system/log/api'

interface MenuNode extends Menu {
  children: MenuNode[]
}

/** 按 parentId 组树（后端返回扁平列表，parent_id 为 null/'' 为顶级） */
function buildTree(menus: Menu[]): MenuNode[] {
  const nodes = new Map<string, MenuNode>(menus.map(m => [m.id, { ...m, children: [] }]))
  const roots: MenuNode[] = []
  for (const m of menus) {
    const node = nodes.get(m.id)
    if (!node) continue
    const parent = m.parentId ? nodes.get(m.parentId) : undefined
    if (parent && parent.id !== m.id) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }
  const sortRecursive = (list: MenuNode[]) => {
    list.sort((a, b) => a.sortNo - b.sortNo)
    list.forEach(n => sortRecursive(n.children))
  }
  sortRecursive(roots)
  return roots
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** 左侧树单行（目录/菜单） */
function TreeRow({
  node,
  depth,
  collapsed,
  selectedId,
  onToggle,
  onSelect,
  onAddChild
}: {
  node: MenuNode
  depth: number
  collapsed: Set<string>
  selectedId: string | null
  onToggle: (id: string) => void
  onSelect: (menu: Menu) => void
  onAddChild: (parentId: string) => void
}) {
  const hasChildren = node.children.length > 0
  const isCollapsed = collapsed.has(node.id)
  const isButton = node.menuType === 2
  const selected = selectedId === node.id
  return (
    <div>
      <div
        className={cn(
          'group hover:bg-accent flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm',
          selected && 'bg-accent font-medium'
        )}
        style={{ paddingInlineStart: depth * 16 + 8 }}
        onClick={() => onSelect(node)}
      >
        {isButton ? (
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs leading-none">按钮</span>
        ) : (
          <>
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
            <Folder className="text-muted-foreground size-3.5 shrink-0" />
          </>
        )}
        <span className="truncate">{node.name}</span>
        {!isButton && hasPermission('system:menu:add') && (
          <Button
            variant="ghost"
            size="icon"
            title="新增子菜单"
            aria-label={`在「${node.name}」下新增`}
            className="ms-auto size-6 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={e => {
              e.stopPropagation()
              onAddChild(node.id)
            }}
          >
            <Plus className="size-3.5" />
          </Button>
        )}
      </div>
      {!isCollapsed && hasChildren && (
        <div>
          {node.children.map(child => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsed={collapsed}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function MenuPage() {
  const [list, setList] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Menu | null>(null)
  const [createParentId, setCreateParentId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Menu | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(false)
    fetchMenus()
      .then(setList)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const tree = useMemo(() => buildTree(list), [list])
  const byId = useMemo(() => new Map(list.map(m => [m.id, m])), [list])
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null

  /** 首次加载完成自动选中第一个「菜单」节点，避免刚进来右侧空白 */
  const autoSelectedRef = useRef(false)
  useEffect(() => {
    if (loading || loadError || autoSelectedRef.current || tree.length === 0) return
    autoSelectedRef.current = true
    const findFirstMenu = (nodes: MenuNode[]): MenuNode | null => {
      for (const n of nodes) {
        if (n.menuType === 1) return n
        const child = findFirstMenu(n.children)
        if (child) return child
      }
      return null
    }
    const first = findFirstMenu(tree) ?? tree[0]
    if (first) setSelectedId(first.id)
  }, [loading, loadError, tree])

  /** 选中的目录/菜单直属按钮（按钮权限列表数据源） */
  const buttonChildren = useMemo(() => {
    if (!selected || selected.menuType === 2) return []
    return list
      .filter(m => m.parentId === selected.id && m.menuType === 2)
      .sort((a, b) => a.sortNo - b.sortNo)
  }, [list, selected])

  /** 根目录总览：类型统计 */
  const stats = useMemo(() => {
    let dirs = 0
    let menus = 0
    let buttons = 0
    for (const m of list) {
      if (m.menuType === 0) dirs++
      else if (m.menuType === 1) menus++
      else if (m.menuType === 2) buttons++
    }
    return { total: list.length, dirs, menus, buttons }
  }, [list])

  /** 搜索：命中名称/路由/权限字符的扁平列表（左树切换为搜索结果模式） */
  const searching = keyword.trim() !== ''
  const searchResults = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return []
    return list.filter(
      m => m.name.toLowerCase().includes(kw) || (m.url ?? '').toLowerCase().includes(kw) || (m.perms ?? '').toLowerCase().includes(kw)
    )
  }, [list, keyword])

  const toggle = (id: string) =>
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })

  /** 导出权限快照：只导出不导入（菜单主键/父级关系跨库无法对应） */
  const handleExport = () => {
    setExporting(true)
    exportMenus()
      .then(({ filename, blob }) => {
        saveBlobFile(filename, blob)
        toast.success('菜单权限已导出')
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '导出失败'))
      .finally(() => setExporting(false))
  }

  const openCreate = (parentId: string | null) => {
    setEditing(null)
    setCreateParentId(parentId)
    setFormOpen(true)
  }

  const openEdit = (menu: Menu) => {
    setEditing(menu)
    setFormOpen(true)
  }

  /** 保存：菜单本体 + 「权限节点」穿梭框全量替换（按钮类型没有穿梭框，permNodes 为空） */
  const handleSubmit = (values: MenuWritePayload, permNodes: PermNode[]) => {
    const request = editing
      ? withOperationLog('更新菜单', () => updateMenu(editing.id, values))
      : withOperationLog('新增菜单', () => createMenu({ ...values, parentId: createParentId ?? values.parentId ?? null }))
    request
      .then(saved => {
        if (values.menuType === 2) return null
        const targetId = editing?.id ?? (saved as Menu).id
        return withOperationLog('更新菜单权限节点', () => savePermNodes(targetId, permNodes)).then(result => {
          const { added, removed } = result
          if (added.length > 0 || removed.length > 0) {
            toast.success(`按钮权限已更新：新增 ${added.length} 个，移除 ${removed.length} 个`)
          }
        })
      })
      .then(() => {
        toast.success(editing ? '菜单已更新' : '菜单已创建')
        setFormOpen(false)
        load()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '保存失败'))
  }

  const handleDelete = () => {
    if (!deleting) return
    withOperationLog(`删除菜单「${deleting.name}」`, () => deleteMenu(deleting.id))
      .then(() => {
        toast.success(`已删除菜单「${deleting.name}」`)
        if (deleting.id === selectedId) setSelectedId(null)
        load()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '删除失败（有子菜单时需先删子级）'))
    setDeleting(null)
  }

  /** 菜单详情两列描述（字段顺序对齐参考稿：类型/状态、名称/路由、外链/显示） */
  const detailRows: ReactNode = selected ? (
    <>
      <DetailRow label="菜单类型">
        {selected.menuType === 2 ? (
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">按钮</span>
        ) : (
          <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs">{menuTypeMap[selected.menuType] ?? '菜单'}</span>
        )}
      </DetailRow>
      <DetailRow label="菜单状态">
        <StatusBadge ok={selected.status === '1'} label={selected.status === '1' ? '正常' : '停用'} />
      </DetailRow>
      <DetailRow label="菜单名称">{selected.name}</DetailRow>
      <DetailRow label="路由地址">
        <span className="font-mono text-xs">{selected.url ?? '-'}</span>
      </DetailRow>
      <DetailRow label="是否外链">
        <span className={cn('rounded px-1.5 py-0.5 text-xs', selected.internalOrExternal === 1 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
          {selected.internalOrExternal === 1 ? '是' : '否'}
        </span>
      </DetailRow>
      <DetailRow label="显示状态">
        <span className={cn('rounded px-1.5 py-0.5 text-xs', selected.hidden === 1 ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>
          {selected.hidden === 1 ? '隐藏' : '显示'}
        </span>
      </DetailRow>
      {selected.menuType === 1 && (
        <DetailRow label="组件路径">
          <span className="font-mono text-xs">{selected.component ?? '-'}</span>
        </DetailRow>
      )}
      {selected.perms && (
        <DetailRow label="权限标识">
          <span className="font-mono text-xs">{selected.perms}</span>
        </DetailRow>
      )}
      <DetailRow label="排序">{selected.sortNo}</DetailRow>
      <DetailRow label="创建时间">
        <span className="text-muted-foreground text-xs tabular-nums">{formatDateTime(selected.createTime)}</span>
      </DetailRow>
    </>
  ) : null

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
      {/* 左：菜单树（搜索 + 快捷新增） */}
      <Card className="h-fit xl:sticky xl:top-4">
        <div className="flex items-center justify-between px-3">
          <span className="text-sm font-semibold">菜单列表</span>
          <div className="flex items-center gap-0.5">
            {hasPermission('system:menu:add') && (
              <Button variant="ghost" size="icon" className="size-7" title="新增根菜单" onClick={() => openCreate(null)}>
                <Plus className="size-4" />
              </Button>
            )}
            {hasPermission('system:menu:export') && (
              <Button variant="ghost" size="icon" className="size-7" title="导出" onClick={handleExport} disabled={exporting || list.length === 0}>
                <Download className="size-4" />
              </Button>
            )}
            <RefreshButton onClick={() => void load()} disabled={loading} spinning={loading} className="size-7" />
          </div>
        </div>
        <div className="px-3 pt-2 pb-1">
          <Input placeholder="请输入菜单名称" className="h-8 text-sm" value={keyword} onChange={e => setKeyword(e.target.value)} />
        </div>
        {/* data-scroll：复用全局「默认隐藏、悬停显现」滚动条样式，与侧边栏一致 */}
        <CardContent data-scroll="tree" className="max-h-[calc(100vh-260px)] overflow-y-auto px-2 pb-2">
          {loadError ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <p className="text-muted-foreground text-sm">菜单数据加载失败</p>
              <RefreshButton onClick={() => void load()} title="重新加载" />
            </div>
          ) : loading ? (
            <div className="space-y-2 py-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : searching ? (
            <div className="py-1">
              {searchResults.length ? (
                searchResults.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    className={cn(
                      'hover:bg-accent flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-start text-sm',
                      selectedId === m.id && 'bg-accent font-medium'
                    )}
                    onClick={() => setSelectedId(m.id)}
                  >
                    {m.menuType === 2 ? (
                      <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs leading-none">按钮</span>
                    ) : (
                      <Folder className="text-muted-foreground size-3.5 shrink-0" />
                    )}
                    <span className="truncate">{m.name}</span>
                  </button>
                ))
              ) : (
                <p className="text-muted-foreground py-6 text-center text-sm">没有匹配的菜单</p>
              )}
            </div>
          ) : (
            <div className="py-1">
              {/* 虚拟根节点：对齐后端 parent=null 语义，快捷建顶级菜单 */}
              <button
                type="button"
                className={cn(
                  'hover:bg-accent flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-start text-sm',
                  !selectedId && 'bg-accent font-medium'
                )}
                onClick={() => setSelectedId(null)}
              >
                <Folder className="text-muted-foreground size-3.5 shrink-0" />
                根目录
              </button>
              {tree.map(node => (
                <TreeRow
                  key={node.id}
                  node={node}
                  depth={1}
                  collapsed={collapsed}
                  selectedId={selectedId}
                  onToggle={toggle}
                  onSelect={menu => setSelectedId(menu.id)}
                  onAddChild={parentId => openCreate(parentId)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 右：菜单详情 + 按钮权限列表 */}
      <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">{selected ? '菜单详情' : '菜单总览'}</CardTitle>
            <div className="flex items-center gap-2">
              {hasPermission('system:menu:add') && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-primary"
                  disabled={!selected || selected.menuType === 2}
                  onClick={() => openCreate(selected!.id)}
                >
                  <Plus className="size-4" />
                  新增子菜单
                </Button>
              )}
              {hasPermission('system:menu:update') && (
                <Button size="sm" variant="outline" className="h-8" disabled={!selected} onClick={() => openEdit(selected!)}>
                  <SquarePen className="size-4" />
                  编辑
                </Button>
              )}
              {hasPermission('system:menu:delete') && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive h-8"
                  disabled={!selected}
                  onClick={() => setDeleting(selected!)}
                >
                  <Trash2 className="size-4" />
                  删除
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selected ? (
              <dl className="grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">{detailRows}</dl>
            ) : loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[70px] w-full rounded-lg" />
                ))}
              </div>
            ) : stats.total === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="text-muted-foreground text-sm">还没有任何菜单</p>
                {hasPermission('system:menu:add') && (
                  <Button size="sm" onClick={() => openCreate(null)}>
                    <Plus className="size-4" />
                    创建第一个菜单
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatBlock icon={<ListTree className="size-4" />} label="菜单总数" value={stats.total} />
                  <StatBlock icon={<Folder className="size-4" />} label="目录" value={stats.dirs} />
                  <StatBlock icon={<PanelTop className="size-4" />} label="页面菜单" value={stats.menus} />
                  <StatBlock icon={<MousePointerClick className="size-4" />} label="按钮权限" value={stats.buttons} />
                </div>
                <div>
                  <p className="text-muted-foreground mb-2 text-xs">顶级菜单速览 · 点击卡片查看详情</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {tree.map(node => (
                      <button
                        key={node.id}
                        type="button"
                        className="hover:border-primary/40 hover:bg-accent/50 flex items-center gap-2.5 rounded-lg border p-3 text-start transition-colors"
                        onClick={() => setSelectedId(node.id)}
                      >
                        <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
                          {node.menuType === 0 ? <Folder className="size-4" /> : <PanelTop className="size-4" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{node.name}</span>
                          <span className="text-muted-foreground block text-xs">
                            {node.children.length ? `${countDescendants(node)} 个子项` : '暂无子级'}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {selected && selected.menuType !== 2 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">按钮权限列表</CardTitle>
              <RefreshButton onClick={() => void load()} disabled={loading} spinning={loading} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : buttonChildren.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14 text-center">序号</TableHead>
                      <TableHead>菜单名称</TableHead>
                      <TableHead>权限字符</TableHead>
                      <TableHead className="w-24">菜单状态</TableHead>
                      <TableHead className="w-44">创建时间</TableHead>
                      <TableHead className="text-end">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buttonChildren.map((m, i) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-muted-foreground text-center tabular-nums">{i + 1}</TableCell>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell>
                          <span className="text-muted-foreground font-mono text-xs">{m.perms ?? '-'}</span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge ok={m.status === '1'} label={m.status === '1' ? '正常' : '停用'} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs tabular-nums">{formatDateTime(m.createTime)}</TableCell>
                        <TableCell className="text-end whitespace-nowrap">
                          {hasPermission('system:menu:update') && (
                            <Button variant="ghost" size="icon" title="修改" className="text-primary hover:text-primary size-7" onClick={() => openEdit(m)}>
                              <SquarePen className="size-3.5" />
                            </Button>
                          )}
                          {hasPermission('system:menu:delete') && (
                            <Button variant="ghost" size="icon" title="删除" className="text-destructive hover:text-destructive size-7" onClick={() => setDeleting(m)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  暂无按钮权限
                  {hasPermission('system:menu:add') && (
                    <button type="button" className="text-primary ms-2 hover:underline" onClick={() => openCreate(selected.id)}>
                      新增按钮
                    </button>
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {formOpen && (
        <MenuFormDialog
          key={editing?.id ?? `new-${createParentId ?? 0}`}
          open={formOpen}
          onOpenChange={setFormOpen}
          menu={editing}
          parentId={createParentId}
          menus={list}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmDialog
        confirmText="删除"
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除菜单「{deleting?.name}」。存在子菜单时删除会被拒绝；删除为软删除，不影响历史授权记录。</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}

/** 详情描述行：灰 label + 值，两列栅格 */
function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-border/60 flex items-center gap-3 border-b px-2 py-2.5 last:border-b-0">
      <dt className="text-muted-foreground w-20 shrink-0 text-sm">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-sm">{children}</dd>
    </div>
  )
}

/** 总览统计块：图标 + 数字 + 标签 */
function StatBlock({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="bg-muted/40 flex items-center gap-3 rounded-lg border px-3 py-3">
      <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">{icon}</span>
      <div className="min-w-0">
        <p className="text-xl leading-tight font-semibold tabular-nums">{value}</p>
        <p className="text-muted-foreground truncate text-xs">{label}</p>
      </div>
    </div>
  )
}

/** 递归统计子孙节点数（含按钮） */
function countDescendants(node: MenuNode): number {
  return node.children.reduce((acc, c) => acc + 1 + countDescendants(c), 0)
}
