import { useMemo, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Menu } from '../../menu/api'
import type { Role } from '../api'

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

function collectIds(node: MenuNode): number[] {
  return [node.id, ...node.children.flatMap(collectIds)]
}

interface RolePermissionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 要分配权限的角色 */
  role: Role
  /** 全部菜单（树形勾选项） */
  menus: Menu[]
  onSubmit: (menuIds: number[]) => void
}

/** 由父组件按 key 控制重挂载，保证打开时勾选状态初始化为角色已有权限 */
export function RolePermissionDialog({ open, onOpenChange, role, menus, onSubmit }: RolePermissionDialogProps) {
  const tree = useMemo(() => buildTree(menus), [menus])
  const [checked, setChecked] = useState<Set<number>>(() => new Set(role.menus))
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())

  const toggleNode = (node: MenuNode) => {
    const ids = collectIds(node)
    const next = new Set(checked)
    if (ids.every(id => next.has(id))) {
      ids.forEach(id => next.delete(id))
    } else {
      ids.forEach(id => next.add(id))
    }
    setChecked(next)
  }

  const toggleFold = (id: number) =>
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })

  const renderNodes = (nodes: MenuNode[], depth: number): ReactNode[] =>
    nodes.flatMap(node => {
      const ids = collectIds(node)
      const checkedCount = ids.filter(id => checked.has(id)).length
      const allChecked = checkedCount === ids.length
      const someChecked = checkedCount > 0 && !allChecked
      const hasChildren = node.children.length > 0
      const isCollapsed = collapsed.has(node.id)
      const row = (
        <div key={node.id} className="flex items-center gap-1 py-1" style={{ paddingInlineStart: depth * 20 }}>
          {hasChildren ? (
            <Button variant="ghost" size="icon" className="size-6" onClick={() => toggleFold(node.id)}>
              <ChevronRight className={`size-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
              <span className="sr-only">展开 / 收起</span>
            </Button>
          ) : (
            <span className="size-6" />
          )}
          <input
            type="checkbox"
            className="accent-primary size-4 shrink-0 cursor-pointer"
            checked={allChecked}
            ref={el => {
              if (el) el.indeterminate = someChecked
            }}
            onChange={() => toggleNode(node)}
          />
          <span className="cursor-pointer select-none" onClick={() => toggleNode(node)}>
            {node.name}
          </span>
          <span className="text-muted-foreground font-mono text-xs">{node.path}</span>
        </div>
      )
      return isCollapsed || !hasChildren ? [row] : [row, ...renderNodes(node.children, depth + 1)]
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>分配权限</DialogTitle>
          <DialogDescription>为角色「{role.name}」勾选可见菜单，勾选父级会连同勾选全部子菜单</DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-auto rounded-md border p-3">{renderNodes(tree, 0)}</div>
        <p className="text-muted-foreground text-xs">
          已选 {checked.size} / {menus.length} 个菜单
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={() => {
              onSubmit([...checked])
              onOpenChange(false)
            }}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
