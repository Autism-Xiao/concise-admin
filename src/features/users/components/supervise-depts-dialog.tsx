import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { assignUserSuperviseDepts, fetchBackendDepts, fetchUserSuperviseDepts, type User } from '../api'

interface SuperviseDeptsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
  onSaved: () => void
}

interface DeptNode {
  id: string
  departName: string
  depth: number
}

interface DeptRaw {
  id: string
  departName: string
  parentId?: string | null
  status?: string
}

/** 扁平部门列表按父子关系排成深度优先序，渲染时按 depth 缩进 */
function toTreeOrder(depts: DeptRaw[]): DeptNode[] {
  const childrenOf = new Map<string, DeptRaw[]>()
  const roots: DeptRaw[] = []
  const seen = new Set<string>()
  for (const dept of depts) {
    if (seen.has(dept.id)) continue
    seen.add(dept.id)
    const parent = dept.parentId && dept.parentId !== '0' ? dept.parentId : ''
    if (!parent) {
      roots.push(dept)
    } else {
      const list = childrenOf.get(parent) ?? []
      list.push(dept)
      childrenOf.set(parent, list)
    }
  }
  const nodes: DeptNode[] = []
  const visit = (dept: DeptRaw, depth: number, ancestors: Set<string>) => {
    if (ancestors.has(dept.id)) return // 防御脏数据成环
    nodes.push({ id: dept.id, departName: dept.departName, depth })
    const next = new Set(ancestors)
    next.add(dept.id)
    for (const child of childrenOf.get(dept.id) ?? []) visit(child, depth + 1, next)
  }
  for (const root of roots) visit(root, 0, new Set())
  return nodes
}

/**
 * 管辖部门配置（ReBAC 监管数据权限的租户端入口）：
 *
 * 勾选 = 该用户可监管哪些部门的业务数据（只对角色 data_scope 为
 * 「本部门 / 本部门及以下」的人生效；「全部」不收窄、「仅本人」不放大）。
 * 后端保存时自动展开子孙部门，所以这里只需勾选关注的顶层节点。
 */
export function SuperviseDeptsDialog({ open, onOpenChange, user, onSaved }: SuperviseDeptsDialogProps) {
  const [depts, setDepts] = useState<DeptNode[] | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setDepts(null)
    setSelected([])
    setLoadError(null)
    Promise.all([fetchBackendDepts(), fetchUserSuperviseDepts(user.id)])
      .then(([deptList, deptIds]) => {
        setDepts(toTreeOrder(deptList))
        setSelected(deptIds)
      })
      .catch(e => setLoadError(e instanceof Error ? e.message : '加载部门失败'))
  }, [open, user.id])

  const selectedSet = useMemo(() => new Set(selected), [selected])

  const toggle = (id: string) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await assignUserSuperviseDepts(user.id, selected)
      toast.success(`已更新「${user.realname || user.username}」的管辖部门`)
      onOpenChange(false)
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>管辖部门</DialogTitle>
          <DialogDescription>
            账号：{user.realname || user.username}（{user.username}）
            <br />
            勾选后该用户的数据可见范围额外包含所选部门成员创建的数据（仅对角色数据范围为「本部门 / 本部门及以下」的人生效）。
          </DialogDescription>
        </DialogHeader>

        <form id="supervise-depts-form" className="space-y-3" onSubmit={submit}>
          {loadError ? (
            <p className="text-destructive text-sm">{loadError}</p>
          ) : !depts ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-5 w-3/5" />
            </div>
          ) : depts.length === 0 ? (
            <p className="text-muted-foreground py-2 text-sm">当前租户还没有部门，请先在「部门管理」里创建。</p>
          ) : (
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2">
              {depts.map(dept => (
                <label
                  key={dept.id}
                  className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm"
                  style={{ paddingLeft: dept.depth * 20 + 4 }}
                >
                  <input type="checkbox" className="accent-primary" checked={selectedSet.has(dept.id)} onChange={() => toggle(dept.id)} />
                  {dept.departName}
                </label>
              ))}
            </div>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button type="submit" form="supervise-depts-form" disabled={submitting || !!loadError || !depts?.length}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
