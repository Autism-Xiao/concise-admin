import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronRight, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { StatusBadge } from '@/components/status-badge'
import { MenuFormDialog } from './components/menu-form-dialog'
import { fetchMenus, saveMenus, type Menu } from './api'
import { withOperationLog } from '@/features/system/log/api'

interface MenuNode extends Menu {
  children: MenuNode[]
}

/** 按路径推导树形结构：/system/users 挂在 path 为 /system 的菜单下 */
function buildTree(menus: Menu[]): MenuNode[] {
  const byPath = new Map(menus.map(m => [m.path, m]))
  const nodes = new Map<number, MenuNode>(menus.map(m => [m.id, { ...m, children: [] }]))
  const roots: MenuNode[] = []
  for (const m of menus) {
    const node = nodes.get(m.id)
    if (!node) continue
    const parentPath = m.path.slice(0, m.path.lastIndexOf('/'))
    const parent = parentPath ? byPath.get(parentPath) : undefined
    if (parent && parent.id !== m.id) {
      nodes.get(parent.id)?.children.push(node)
    } else {
      roots.push(node)
    }
  }
  const sortRecursive = (list: MenuNode[]) => {
    list.sort((a, b) => a.sort - b.sort)
    list.forEach(n => sortRecursive(n.children))
  }
  sortRecursive(roots)
  return roots
}

export function MenuPage() {
  const [list, setList] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Menu | null>(null)
  const [createParentId, setCreateParentId] = useState<number | null>(null)
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

  /** 乐观更新 + 写回 menus.json，失败回退重新加载；操作记入操作日志 */
  const persist = (next: Menu[], successMsg: string) => {
    setList(next)
    setSaving(true)
    withOperationLog(successMsg, () => saveMenus(next))
      .then(() => toast.success(successMsg))
      .catch(() => {
        toast.error('写入 menus.json 失败，已重新加载')
        load()
      })
      .finally(() => setSaving(false))
  }

  const openCreate = (parentId: number | null) => {
    setEditing(null)
    setCreateParentId(parentId)
    setFormOpen(true)
  }

  const openEdit = (menu: Menu) => {
    setEditing(menu)
    setFormOpen(true)
  }

  const handleSubmit = (values: Omit<Menu, 'id'>) => {
    if (editing) {
      persist(
        list.map(m => (m.id === editing.id ? { ...m, ...values } : m)),
        '菜单已更新'
      )
    } else {
      const id = list.length ? Math.max(...list.map(m => m.id)) + 1 : 1
      persist([...list, { ...values, id }], '菜单已创建')
    }
    setFormOpen(false)
  }

  const handleDelete = () => {
    if (!deleting) return
    // 级联删除所有路径前缀匹配的子菜单
    const prefix = deleting.path + '/'
    const removed = list.filter(m => m.id === deleting.id || m.path.startsWith(prefix)).length
    persist(
      list.filter(m => m.id !== deleting.id && !m.path.startsWith(prefix)),
      removed > 1 ? `已删除「${deleting.name}」及其 ${removed - 1} 个子菜单` : `已删除菜单「${deleting.name}」`
    )
    setDeleting(null)
  }

  const filtering = keyword.trim() !== '' || statusFilter !== 'all'
  const tree = useMemo(() => buildTree(list), [list])
  const flatList = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return list
      .filter(m => (statusFilter === 'all' || m.status === statusFilter) && (!kw || m.name.toLowerCase().includes(kw) || m.path.toLowerCase().includes(kw)))
      .sort((a, b) => a.sort - b.sort)
  }, [list, keyword, statusFilter])

  const toggle = (id: number) =>
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })

  const renderRows = (nodes: MenuNode[], depth: number): ReactNode[] =>
    nodes.flatMap(node => {
      const hasChildren = node.children.length > 0
      const isCollapsed = collapsed.has(node.id)
      const row = (
        <TableRow key={node.id}>
          <TableCell>
            <div className="flex items-center gap-1" style={{ paddingInlineStart: depth * 20 }}>
              {hasChildren ? (
                <Button variant="ghost" size="icon" className="size-6" onClick={() => toggle(node.id)}>
                  <ChevronRight className={`size-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
                  <span className="sr-only">展开 / 收起</span>
                </Button>
              ) : (
                <span className="size-6" />
              )}
              <span className="font-medium">{node.name}</span>
            </div>
          </TableCell>
          <TableCell>
            <span className="font-mono text-xs">{node.path}</span>
          </TableCell>
          <TableCell>{node.sort}</TableCell>
          <TableCell>
            <StatusBadge ok={node.status === '正常'} label={node.status} />
          </TableCell>
          <TableCell className="text-end">
            <Button variant="ghost" size="icon" title="新增子菜单" onClick={() => openCreate(node.id)}>
              <Plus className="size-4" />
              <span className="sr-only">新增子菜单</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => openEdit(node)}>
              <Pencil className="size-4" />
              <span className="sr-only">编辑</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleting(node)}>
              <Trash2 className="text-destructive size-4" />
              <span className="sr-only">删除</span>
            </Button>
          </TableCell>
        </TableRow>
      )
      return isCollapsed ? [row] : [row, ...renderRows(node.children, depth + 1)]
    })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">菜单管理</h1>
          <p className="text-muted-foreground text-sm">
            {loading ? '加载中…' : `共 ${list.length} 个菜单`}
            {saving && '（保存中…）'}
          </p>
        </div>
        <Button onClick={() => openCreate(null)}>
          <Plus />
          新增菜单
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
              <Input placeholder="搜索名称 / 路由" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
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
                  <TableHead>菜单名称</TableHead>
                  <TableHead>路由地址</TableHead>
                  <TableHead className="w-20">排序</TableHead>
                  <TableHead className="w-24">状态</TableHead>
                  <TableHead className="w-36 text-end">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtering ? (
                  flatList.length ? (
                    renderRows(
                      flatList.map(m => ({ ...m, children: [] })),
                      0
                    )
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
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

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除菜单「{deleting?.name}」及其所有子菜单，该操作不可恢复。</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}
