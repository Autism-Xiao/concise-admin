import { useMemo, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/** 后端菜单树节点（GET /api/menus/tree，含按钮节点） */
export interface MenuTreeNode {
  id: string
  parentId?: string | null
  name?: string
  url?: string | null
  /** 0 目录 / 1 菜单 / 2 按钮权限 */
  menuType?: number
  status?: string
  children: MenuTreeNode[]
}

function collectIds(node: MenuTreeNode): string[] {
  return [node.id, ...node.children.flatMap(collectIds)]
}

/** 全部叶子 id 总数（按钮也算一项） */
function countAll(nodes: MenuTreeNode[]): number {
  return nodes.reduce((n, node) => n + 1 + countAll(node.children), 0)
}

interface RolePermissionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 要分配权限的角色 */
  role: { id: string; roleName?: string; roleCode: string }
  /** 后端菜单树（含按钮节点） */
  tree: MenuTreeNode[]
  /** 已授权 id（打开时回显） */
  checkedIds: string[]
  saving?: boolean
  onSubmit: (menuIds: string[]) => void
}

/** 由父组件按 key 控制重挂载，保证打开时勾选状态初始化为角色已有权限 */
export function RolePermissionDialog({ open, onOpenChange, role, tree, checkedIds, saving, onSubmit }: RolePermissionDialogProps) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set(checkedIds))
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const total = useMemo(() => countAll(tree), [tree])

  const toggleNode = (node: MenuTreeNode) => {
    const ids = collectIds(node)
    const next = new Set(checked)
    if (ids.every(id => next.has(id))) {
      ids.forEach(id => next.delete(id))
    } else {
      ids.forEach(id => next.add(id))
    }
    setChecked(next)
  }

  const toggleFold = (id: string) =>
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })

  const renderNodes = (nodes: MenuTreeNode[], depth: number): ReactNode[] =>
    nodes.flatMap(node => {
      const ids = collectIds(node)
      const checkedCount = ids.filter(id => checked.has(id)).length
      const allChecked = checkedCount === ids.length
      const someChecked = checkedCount > 0 && !allChecked
      const hasChildren = node.children.length > 0
      const isCollapsed = collapsed.has(node.id)
      const isButton = node.menuType === 2
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
          {isButton ? (
            <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">按钮</span>
          ) : (
            <span className="text-muted-foreground font-mono text-xs">{node.url}</span>
          )}
        </div>
      )
      return isCollapsed || !hasChildren ? [row] : [row, ...renderNodes(node.children, depth + 1)]
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>分配权限</DialogTitle>
          <DialogDescription>为角色「{role.roleName ?? role.roleCode}」勾选菜单与按钮权限，勾选父级会连同勾选全部子级</DialogDescription>
        </DialogHeader>
        <div className="max-h-96 overflow-auto rounded-md border p-3">{renderNodes(tree, 0)}</div>
        <p className="text-muted-foreground text-xs">
          已选 {checked.size} / {total} 项
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={saving}
            onClick={() => {
              onSubmit([...checked])
            }}
          >
            {saving ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
