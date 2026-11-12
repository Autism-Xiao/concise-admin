import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronRight, Download, Plus, RefreshCw, Search, SquarePen, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

export function MenuPage() {
  const [list, setList] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
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
        load()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '删除失败（有子菜单时需先删子级）'))
    setDeleting(null)
  }

  const searching = appliedKeyword.trim() !== ''
  const tree = useMemo(() => buildTree(list), [list])
  const flatList = useMemo(() => {
    const kw = appliedKeyword.trim().toLowerCase()
    return list.filter(m => !kw || m.name.toLowerCase().includes(kw) || (m.url ?? '').toLowerCase().includes(kw) || (m.perms ?? '').toLowerCase().includes(kw))
  }, [list, appliedKeyword])

  const resetSearch = () => {
    setKeyword('')
    setAppliedKeyword('')
  }

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

  // counter 贯穿递归，保证序号按「展开后的视觉顺序」连续递增
  const renderRows = (nodes: MenuNode[], depth: number, counter: { n: number } = { n: 0 }): ReactNode[] =>
    nodes.flatMap(node => {
      const hasChildren = node.children.length > 0
      const isCollapsed = collapsed.has(node.id)
      const isButton = node.menuType === 2
      const row = (
        <TableRow key={node.id}>
          <TableCell className="text-muted-foreground w-14 text-center tabular-nums">{++counter.n}</TableCell>
          <TableCell>
            <div className="flex items-center gap-1" style={{ paddingInlineStart: depth * 20 }}>
              {hasChildren ? (
                <Button variant="ghost" size="icon" className="size-6" onClick={() => toggle(node.id)}>
                  <ChevronRight className={cn('size-4 transition-transform', isCollapsed ? '' : 'rotate-90')} />
                  <span className="sr-only">展开 / 收起</span>
                </Button>
              ) : (
                <span className="size-6" />
              )}
              <span className="font-medium">{node.name}</span>
            </div>
          </TableCell>
          <TableCell>
            {isButton ? (
              <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">按钮</span>
            ) : (
              <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs">{menuTypeMap[node.menuType] ?? '菜单'}</span>
            )}
          </TableCell>
          <TableCell>
            <span className="text-muted-foreground font-mono text-xs">{node.url ?? '-'}</span>
          </TableCell>
          <TableCell>
            <span className="text-muted-foreground font-mono text-xs">{node.component ?? '-'}</span>
          </TableCell>
          <TableCell>
            <span className="text-muted-foreground font-mono text-xs">{node.perms ?? '-'}</span>
          </TableCell>
          <TableCell className="w-14 tabular-nums">{node.sortNo}</TableCell>
          <TableCell className="w-24">
            <StatusBadge ok={node.status === '1'} label={node.status === '1' ? '正常' : '停用'} />
          </TableCell>
          <TableCell className="text-muted-foreground w-40 whitespace-nowrap text-xs tabular-nums">{formatDateTime(node.createTime)}</TableCell>
          <TableCell className="text-end whitespace-nowrap">
            {hasPermission('system:menu:add') && (
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary h-7 gap-0.5 px-1.5" onClick={() => openCreate(node.id)}>
                <Plus className="size-3.5" />
                新增
              </Button>
            )}
            {hasPermission('system:menu:update') && (
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary h-7 gap-0.5 px-1.5" onClick={() => openEdit(node)}>
                <SquarePen className="size-3.5" />
                修改
              </Button>
            )}
            {hasPermission('system:menu:delete') && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-7 gap-0.5 px-1.5" onClick={() => setDeleting(node)}>
                <Trash2 className="size-3.5" />
                删除
              </Button>
            )}
          </TableCell>
        </TableRow>
      )
      return isCollapsed ? [row] : [row, ...renderRows(node.children, depth + 1, counter)]
    })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">菜单管理</h1>
          <p className="text-muted-foreground text-sm">{loading ? '加载中…' : `共 ${list.length} 个菜单（含按钮权限）`}</p>
        </div>
        {hasPermission('system:menu:export') && (
          <Button variant="outline" onClick={handleExport} disabled={exporting || list.length === 0}>
            <Download />
            {exporting ? '导出中…' : '导出'}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="space-y-4">
          {/* 搜索行：输入菜单标题 → 查询；重置恢复全量树 */}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="请输入菜单标题 / 路由 / 权限标识"
              className="h-9 w-72"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') setAppliedKeyword(keyword)
              }}
            />
            <Button size="sm" className="h-9" onClick={() => setAppliedKeyword(keyword)}>
              <Search className="size-4" />
              查询
            </Button>
            <Button size="sm" variant="outline" className="h-9" onClick={resetSearch}>
              重置
            </Button>
          </div>

          {/* 操作 Tab：新增常驻；搜索态提供「查询全部」一键还原 */}
          <div className="border-b">
            <div className="flex items-center gap-1">
              {hasPermission('system:menu:add') && (
                <button
                  type="button"
                  className="text-primary border-primary -mb-px border-b-2 px-3 pb-2 text-sm font-medium"
                  onClick={() => openCreate(null)}
                >
                  新增
                </button>
              )}
              {searching && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground -mb-px border-b-2 border-transparent px-3 pb-2 text-sm font-medium"
                  onClick={resetSearch}
                >
                  查询全部
                </button>
              )}
            </div>
          </div>

          {loadError ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <p className="text-muted-foreground text-sm">菜单数据加载失败</p>
              <Button variant="outline" size="sm" onClick={load}>
                <RefreshCw />
                重新加载
              </Button>
            </div>
          ) : loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14 text-center">序号</TableHead>
                  <TableHead>菜单名称</TableHead>
                  <TableHead className="w-20">菜单类型</TableHead>
                  <TableHead>路由地址</TableHead>
                  <TableHead>组件路径</TableHead>
                  <TableHead>权限标识</TableHead>
                  <TableHead className="w-14">排序</TableHead>
                  <TableHead className="w-24">状态</TableHead>
                  <TableHead className="w-40">创建时间</TableHead>
                  <TableHead className="text-end">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searching ? (
                  flatList.length ? (
                    renderRows(
                      flatList.map(m => ({ ...m, children: [] })),
                      0
                    )
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-muted-foreground py-10 text-center">
                        没有匹配的菜单
                      </TableCell>
                    </TableRow>
                  )
                ) : (
                  renderRows(tree, 0)
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
