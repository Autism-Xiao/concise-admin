import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react'
import { ChevronRight, GripVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { DeptFormDialog, type DeptFormValues } from './components/dept-form-dialog'
import { fetchDepts, saveDepts, type Dept } from './api'
import { withOperationLog } from '@/features/system/log/api'

interface DeptNode extends Dept {
  children: DeptNode[]
}

type DropMode = 'before' | 'into' | 'after'

/** 由 parentId 构建树，同级按 sort 排序 */
function buildTree(depts: Dept[]): DeptNode[] {
  const nodes = new Map<number, DeptNode>(depts.map(d => [d.id, { ...d, children: [] }]))
  const roots: DeptNode[] = []
  for (const d of depts) {
    const node = nodes.get(d.id)
    if (!node) continue
    const parent = d.parentId != null ? nodes.get(d.parentId) : undefined
    if (parent && parent.id !== d.id) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }
  const sortRecursive = (list: DeptNode[]) => {
    list.sort((a, b) => a.sort - b.sort)
    list.forEach(n => sortRecursive(n.children))
  }
  sortRecursive(roots)
  return roots
}

/** 收集某部门及其全部后代的 id（含自身） */
function collectSubtreeIds(id: number, depts: Dept[]): Set<number> {
  const ids = new Set<number>([id])
  let changed = true
  while (changed) {
    changed = false
    for (const d of depts) {
      if (d.parentId != null && ids.has(d.parentId) && !ids.has(d.id)) {
        ids.add(d.id)
        changed = true
      }
    }
  }
  return ids
}

export function DeptPage() {
  const [list, setList] = useState<Dept[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const [dragId, setDragId] = useState<number | null>(null)
  const [dropHint, setDropHint] = useState<{ id: number; mode: DropMode } | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Dept | null>(null)
  const [createParentId, setCreateParentId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<Dept | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchDepts()
      .then(setList)
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const depts = useMemo(() => list ?? [], [list])

  /** 乐观更新 + 写回 depts.json，失败回退重新加载；操作记入操作日志 */
  const persist = (next: Dept[], successMsg: string) => {
    setList(next)
    setSaving(true)
    withOperationLog(successMsg, () => saveDepts(next))
      .then(() => toast.success(successMsg))
      .catch(() => {
        toast.error('写入 depts.json 失败，已重新加载')
        load()
      })
      .finally(() => setSaving(false))
  }

  const openCreate = (parentId: number | null) => {
    setEditing(null)
    setCreateParentId(parentId)
    setFormOpen(true)
  }

  const openEdit = (dept: Dept) => {
    setEditing(dept)
    setFormOpen(true)
  }

  const handleSubmit = (values: DeptFormValues) => {
    if (editing) {
      persist(
        depts.map(d => (d.id === editing.id ? { ...d, ...values } : d)),
        '部门已更新'
      )
    } else {
      const id = depts.length ? Math.max(...depts.map(d => d.id)) + 1 : 1
      persist([{ ...values, id }, ...depts], '部门已创建')
    }
    setFormOpen(false)
  }

  const handleDelete = () => {
    if (!deleting) return
    // 连同下级部门一起删除
    const ids = collectSubtreeIds(deleting.id, depts)
    persist(
      depts.filter(d => !ids.has(d.id)),
      ids.size > 1 ? `已删除部门「${deleting.name}」及其 ${ids.size - 1} 个下级部门` : `已删除部门「${deleting.name}」`
    )
    setDeleting(null)
  }

  const tree = useMemo(() => buildTree(depts), [depts])

  const filtering = keyword.trim() !== ''
  const flatList = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return depts.filter(d => !kw || d.name.toLowerCase().includes(kw) || d.leader.toLowerCase().includes(kw)).sort((a, b) => a.sort - b.sort)
  }, [depts, keyword])

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

  const dropModeOf = (e: DragEvent<HTMLTableRowElement>): DropMode => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientY - rect.top) / rect.height
    if (ratio < 0.25) return 'before'
    if (ratio > 0.75) return 'after'
    return 'into'
  }

  /** 拖拽落点：into=成为子部门，before/after=同级排序；落点后的 sort 会按同级顺序重排 */
  const handleDrop = (targetId: number, mode: DropMode) => {
    const sourceId = dragId
    setDragId(null)
    setDropHint(null)
    if (sourceId == null || sourceId === targetId) return
    if (collectSubtreeIds(sourceId, depts).has(targetId)) {
      toast.error('不能移动到自身或其下级部门')
      return
    }

    const nodeMap = new Map<number, DeptNode>(depts.map(d => [d.id, { ...d, children: [] }]))
    const roots: DeptNode[] = []
    for (const d of depts) {
      const node = nodeMap.get(d.id)
      if (!node) continue
      const parent = d.parentId != null ? nodeMap.get(d.parentId) : undefined
      if (parent && parent.id !== d.id) parent.children.push(node)
      else roots.push(node)
    }
    const source = nodeMap.get(sourceId)
    const target = nodeMap.get(targetId)
    if (!source || !target) return

    // 先从原位置摘除
    const detach = (siblings: DeptNode[]): boolean => {
      const idx = siblings.indexOf(source)
      if (idx >= 0) {
        siblings.splice(idx, 1)
        return true
      }
      return siblings.some(s => detach(s.children))
    }
    detach(roots)

    if (mode === 'into') {
      target.children.push(source)
    } else {
      const insertInto = (siblings: DeptNode[]): boolean => {
        const idx = siblings.indexOf(target)
        if (idx >= 0) {
          siblings.splice(mode === 'before' ? idx : idx + 1, 0, source)
          return true
        }
        return siblings.some(s => insertInto(s.children))
      }
      insertInto(roots)
    }

    // 展平回平铺数组，按同级顺序重排 sort
    const next: Dept[] = []
    const walk = (nodes: DeptNode[], parentId: number | null) => {
      nodes.forEach((n, i) => {
        next.push({ id: n.id, name: n.name, leader: n.leader, sort: i + 1, parentId })
        walk(n.children, n.id)
      })
    }
    walk(roots, null)
    persist(next, '部门结构已调整')
  }

  const renderRows = (nodes: DeptNode[], depth: number): ReactNode[] =>
    nodes.flatMap(node => {
      const hasChildren = node.children.length > 0
      const isCollapsed = collapsed.has(node.id)
      const hint = dropHint?.id === node.id ? dropHint.mode : null
      const row = (
        <TableRow
          key={node.id}
          draggable={!filtering}
          onDragStart={e => {
            e.dataTransfer.effectAllowed = 'move'
            setDragId(node.id)
          }}
          onDragEnd={() => {
            setDragId(null)
            setDropHint(null)
          }}
          onDragOver={e => {
            if (dragId == null || dragId === node.id) return
            e.preventDefault()
            const mode = dropModeOf(e)
            if (dropHint?.id !== node.id || dropHint.mode !== mode) setDropHint({ id: node.id, mode })
          }}
          onDrop={e => {
            e.preventDefault()
            handleDrop(node.id, dropModeOf(e))
          }}
          className={dragId === node.id ? 'opacity-40' : hint === 'into' ? 'bg-accent' : undefined}
          style={
            hint === 'before'
              ? { boxShadow: 'inset 0 2px 0 0 var(--color-primary)' }
              : hint === 'after'
                ? { boxShadow: 'inset 0 -2px 0 0 var(--color-primary)' }
                : undefined
          }
        >
          <TableCell>
            <div className="flex items-center gap-1" style={{ paddingInlineStart: depth * 20 }}>
              {!filtering && <GripVertical className="text-muted-foreground size-4 shrink-0 cursor-grab" />}
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
          <TableCell>{node.leader}</TableCell>
          <TableCell>{node.sort}</TableCell>
          <TableCell className="text-end">
            <Button variant="ghost" size="icon" title="新增子部门" onClick={() => openCreate(node.id)}>
              <Plus className="size-4" />
              <span className="sr-only">新增子部门</span>
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
          <h1 className="text-2xl font-bold">部门管理</h1>
          <p className="text-muted-foreground text-sm">
            {loading ? '加载中…' : `共 ${depts.length} 个部门，拖拽行可调整层级与排序`}
            {saving && '（保存中…）'}
          </p>
        </div>
        <Button onClick={() => openCreate(null)}>
          <Plus />
          新增部门
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
                <Input placeholder="搜索部门 / 负责人" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>部门名称</TableHead>
                  <TableHead className="w-40">负责人</TableHead>
                  <TableHead className="w-20">排序</TableHead>
                  <TableHead className="w-36 text-end">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtering ? (
                  flatList.length ? (
                    renderRows(
                      flatList.map(d => ({ ...d, children: [] })),
                      0
                    )
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground py-10 text-center">
                        没有匹配的部门
                      </TableCell>
                    </TableRow>
                  )
                ) : tree.length ? (
                  renderRows(tree, 0)
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground py-10 text-center">
                      暂无部门，点击右上角「新增部门」创建
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除部门「{deleting?.name}」及其所有下级部门，该操作不可恢复。</>}
        onConfirm={handleDelete}
      />

      {formOpen && (
        <DeptFormDialog
          key={editing?.id ?? `new-${createParentId ?? 0}`}
          open={formOpen}
          onOpenChange={setFormOpen}
          dept={editing}
          parentId={createParentId}
          depts={editing ? depts.filter(d => !collectSubtreeIds(editing.id, depts).has(d.id)) : depts}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
