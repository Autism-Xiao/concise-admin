import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react'
import { ChevronRight, Download, GripVertical, Plus, Search, SquarePen, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { StatusBadge } from '@/components/status-badge'
import { DeptFormDialog } from './components/dept-form-dialog'
import { createDept, deleteDept, deleteDepts, exportDepts, fetchDepts, orgCategoryMap, updateDept, type Dept, type DeptWritePayload } from './api'
import { withOperationLog } from '@/features/system/log/api'
import { hasPermission } from '@/lib/auth'
import { toastBatchResult } from '@/lib/batch-delete'
import { saveBlobFile } from '@/lib/download'

interface DeptNode extends Dept {
  children: DeptNode[]
}

type DropMode = 'before' | 'into' | 'after'

/** 由 parentId 构建树，同级按 departOrder 排序 */
function buildTree(depts: Dept[]): DeptNode[] {
  const nodes = new Map<string, DeptNode>(depts.map(d => [d.id, { ...d, children: [] }]))
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
    list.sort((a, b) => a.departOrder - b.departOrder)
    list.forEach(n => sortRecursive(n.children))
  }
  sortRecursive(roots)
  return roots
}

/** 收集某部门及其全部后代的 id（含自身） */
function collectSubtreeIds(id: string, depts: Dept[]): Set<string> {
  const ids = new Set<string>([id])
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

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function DeptPage() {
  const [list, setList] = useState<Dept[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [exporting, setExporting] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropHint, setDropHint] = useState<{ id: string; mode: DropMode } | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Dept | null>(null)
  const [createParentId, setCreateParentId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Dept | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [batchBusy, setBatchBusy] = useState(false)

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

  const openCreate = (parentId: string | null) => {
    setEditing(null)
    setCreateParentId(parentId)
    setFormOpen(true)
  }

  const openEdit = (dept: Dept) => {
    setEditing(dept)
    setFormOpen(true)
  }

  const handleSubmit = (values: DeptWritePayload) => {
    const request = editing
      ? withOperationLog('更新部门', () => updateDept(editing.id, values))
      : withOperationLog('新增部门', () => createDept({ ...values, parentId: values.parentId ?? createParentId }))
    request
      .then(() => {
        toast.success(editing ? '部门已更新' : '部门已创建')
        setFormOpen(false)
        load()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '保存失败'))
  }

  const handleDelete = () => {
    if (!deleting) return
    withOperationLog(`删除部门「${deleting.departName}」`, () => deleteDept(deleting.id))
      .then(() => {
        toast.success(`已删除部门「${deleting.departName}」`)
        load()
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '删除失败（有子部门或挂用户时会被拒绝）'))
    setDeleting(null)
  }

  const tree = useMemo(() => buildTree(depts), [depts])

  const filtering = keyword.trim() !== ''
  const flatList = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return depts
      .filter(d => !kw || d.departName.toLowerCase().includes(kw) || (d.description ?? '').toLowerCase().includes(kw))
      .sort((a, b) => a.departOrder - b.departOrder)
  }, [depts, keyword])

  const selectableDepts = filtering ? flatList : depts
  const selectedCount = depts.filter(dept => selectedIds.has(dept.id)).length
  const visibleSelectedCount = selectableDepts.filter(dept => selectedIds.has(dept.id)).length
  const allVisibleSelected = selectableDepts.length > 0 && visibleSelectedCount === selectableDepts.length
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleVisibleSelection = () => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      for (const dept of selectableDepts) {
        if (allVisibleSelected) next.delete(dept.id)
        else next.add(dept.id)
      }
      return next
    })
  }

  /** 导出：带完整路径，keyword 与列表筛选一致 */
  const handleExport = () => {
    setExporting(true)
    exportDepts({ keyword: keyword.trim() })
      .then(({ filename, blob }) => {
        saveBlobFile(filename, blob)
        toast.success('部门已导出')
      })
      .catch(e => toast.error(e instanceof Error ? e.message : '导出失败'))
      .finally(() => setExporting(false))
  }

  const handleBatchDelete = async () => {
    const targets = depts.filter(dept => selectedIds.has(dept.id))
    if (!targets.length || batchBusy) return
    setBatchBusy(true)
    try {
      const result = await withOperationLog(`批量删除 ${targets.length} 个部门`, () => deleteDepts(targets.map(dept => dept.id)))
      toastBatchResult(result, '部门')
      setBatchDeleting(false)
      setSelectedIds(new Set())
      load()
    } finally {
      setBatchBusy(false)
    }
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

  const dropModeOf = (e: DragEvent<HTMLTableRowElement>): DropMode => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientY - rect.top) / rect.height
    if (ratio < 0.25) return 'before'
    if (ratio > 0.75) return 'after'
    return 'into'
  }

  /** 拖拽落点：into=成为子部门，before/after=同级排序；只把 parentId/departOrder 变化的节点提交后端 */
  const handleDrop = (targetId: string, mode: DropMode) => {
    const sourceId = dragId
    setDragId(null)
    setDropHint(null)
    if (sourceId == null || sourceId === targetId) return
    if (collectSubtreeIds(sourceId, depts).has(targetId)) {
      toast.error('不能移动到自身或其下级部门')
      return
    }

    const nodeMap = new Map<string, DeptNode>(depts.map(d => [d.id, { ...d, children: [] }]))
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

    // 展平回平铺数组，按同级顺序重排 departOrder
    const next: Dept[] = []
    const walk = (nodes: DeptNode[], parentId: string | null) => {
      nodes.forEach((n, i) => {
        // 保留节点全部字段（部门类型/状态/时间列都在用），只重排 parentId 与同级序号
        next.push({ ...n, parentId, departOrder: i + 1 })
        walk(n.children, n.id)
      })
    }
    walk(roots, null)

    // 只提交 parentId / departOrder 发生变化的节点（换父由后端防环并同步 orgCode）
    const changed = next.filter(n => {
      const old = depts.find(d => d.id === n.id)
      return old && (old.parentId !== n.parentId || old.departOrder !== n.departOrder)
    })
    if (!changed.length) return

    setList(next)
    setSaving(true)
    withOperationLog('部门结构已调整', () =>
      Promise.all(
        changed.map(n => updateDept(n.id, { departName: n.departName, parentId: n.parentId, departOrder: n.departOrder, description: n.description ?? null }))
      )
    )
      .then(() => toast.success('部门结构已调整'))
      .catch(e => {
        toast.error(e instanceof Error ? e.message : '保存失败，已重新加载')
        load()
      })
      .finally(() => setSaving(false))
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
          <TableCell className="w-10">
            <input
              type="checkbox"
              className="accent-primary size-4 cursor-pointer align-middle"
              aria-label={`选择「${node.departName}」`}
              checked={selectedIds.has(node.id)}
              disabled={batchBusy}
              onChange={() => toggleSelection(node.id)}
            />
          </TableCell>
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
              <span className="font-medium">{node.departName}</span>
            </div>
          </TableCell>
          <TableCell>
            <span className="font-mono text-xs">{node.orgCode ?? '-'}</span>
          </TableCell>
          <TableCell>
            {node.orgCategory === '4' || node.orgCategory === '1' ? (
              <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs">{orgCategoryMap[node.orgCategory] ?? '公司'}</span>
            ) : node.orgCategory === '3' ? (
              <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">岗位</span>
            ) : (
              <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded px-1.5 py-0.5 text-xs">部门</span>
            )}
          </TableCell>
          <TableCell className="w-14 tabular-nums">{node.departOrder}</TableCell>
          <TableCell className="w-20">
            <StatusBadge ok={node.status !== '0'} label={node.status === '0' ? '停用' : '正常'} />
          </TableCell>
          <TableCell className="text-muted-foreground max-w-24 truncate text-xs" title={node.description ?? undefined}>
            {node.description ?? '-'}
          </TableCell>
          <TableCell className="text-muted-foreground text-xs">
            <div className="whitespace-nowrap tabular-nums">
              <span className="text-muted-foreground/70 me-1">建</span>
              {formatDateTime(node.createTime)}
            </div>
            <div className="whitespace-nowrap tabular-nums">
              <span className="text-muted-foreground/70 me-1">更</span>
              {formatDateTime(node.updateTime)}
            </div>
          </TableCell>
          <TableCell className="text-end whitespace-nowrap">
            {hasPermission('system:dept:add') && (
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary h-7 gap-0.5 px-1.5" title="新增子部门" onClick={() => openCreate(node.id)}>
                <Plus className="size-3.5" />
                添加
              </Button>
            )}
            {hasPermission('system:dept:update') && (
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary h-7 gap-0.5 px-1.5" onClick={() => openEdit(node)}>
                <SquarePen className="size-3.5" />
                修改
              </Button>
            )}
            {hasPermission('system:dept:delete') && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-7 gap-0.5 px-1.5" onClick={() => setDeleting(node)}>
                <Trash2 className="size-3.5" />
                删除
              </Button>
            )}
          </TableCell>
        </TableRow>
      )
      return isCollapsed ? [row] : [row, ...renderRows(node.children, depth + 1)]
    })

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">部门管理</h1>
          <p className="text-muted-foreground text-sm">
            {loading ? '加载中…' : `共 ${depts.length} 个部门，拖拽行可调整层级与排序`}
            {saving && '（保存中…）'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPermission('system:dept:export') && (
            <Button variant="outline" onClick={handleExport} disabled={exporting || depts.length === 0}>
              <Download />
              {exporting ? '导出中…' : '导出'}
            </Button>
          )}
          {selectedCount > 0 && (
            <Button variant="outline" onClick={() => setBatchDeleting(true)} disabled={batchBusy}>
              <Trash2 />
              批量删除（{selectedCount}）
            </Button>
          )}
          <Button onClick={() => openCreate(null)}>
            <Plus />
            新增部门
          </Button>
        </div>
      </div>
      {/* 整页只占一屏：卡片吃掉剩余高度，部门再多也只在表格内滚动，页面本身不再上下跑 */}
      {loading ? (
        <Card className="flex min-h-0 flex-1 flex-col">
          <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 py-6">
            <Skeleton className="h-9 w-full max-w-md shrink-0" />
            <Skeleton className="min-h-0 w-full flex-1" />
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="flex min-h-0 flex-1 flex-col">
          <CardContent className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-12">
            <p className="text-muted-foreground text-sm">{error}</p>
            <Button variant="outline" onClick={load}>
              重试
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex min-h-0 flex-1 flex-col">
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <div className="relative w-full max-w-xs">
                <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
                <Input placeholder="搜索部门 / 描述" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
            </div>

            <Table containerClassName="min-h-0 flex-1 overflow-y-auto rounded-md border">
              <TableHeader className="bg-card sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="accent-primary size-4 cursor-pointer align-middle"
                      aria-label={filtering ? '全选筛选结果' : '全选部门'}
                      checked={allVisibleSelected}
                      disabled={batchBusy || selectableDepts.length === 0}
                      ref={el => {
                        if (el) el.indeterminate = someVisibleSelected
                      }}
                      onChange={toggleVisibleSelection}
                    />
                  </TableHead>
                  <TableHead>部门名称</TableHead>
                  <TableHead className="w-32">部门编码</TableHead>
                  <TableHead className="w-20">部门类型</TableHead>
                  <TableHead className="w-14">排序</TableHead>
                  <TableHead className="w-20">状态</TableHead>
                  <TableHead className="w-24">备注</TableHead>
                  <TableHead className="w-36">创建 / 更新</TableHead>
                  <TableHead className="w-44 text-end">操作</TableHead>
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
                      <TableCell colSpan={9} className="text-muted-foreground py-10 text-center">
                        没有匹配的部门
                      </TableCell>
                    </TableRow>
                  )
                ) : tree.length ? (
                  renderRows(tree, 0)
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-muted-foreground py-10 text-center">
                      暂无部门，点击右上角「新增部门」创建
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        confirmText="删除"
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除部门「{deleting?.departName}」。存在子部门或部门下仍有用户时后端会拒绝删除；删除为软删除。</>}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        confirmText="删除"
        open={batchDeleting}
        onOpenChange={v => !batchBusy && setBatchDeleting(v)}
        title="批量删除部门"
        description={
          <>
            即将删除勾选的 {selectedCount} 个部门。存在子部门或部门下仍有用户时后端会拒绝删除；删除为软删除。
            {batchBusy ? '正在删除，请稍候…' : ''}
          </>
        }
        onConfirm={handleBatchDelete}
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
