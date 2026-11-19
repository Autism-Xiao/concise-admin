import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { RefreshButton } from '@/components/ui/refresh-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { hasPermission } from '@/lib/auth'
import {
  createSupplier,
  deleteSupplier,
  fetchSuppliers,
  updateSupplier,
  type Supplier
} from './api'

/** 供应商管理（生成器产物骨架：表格 + 新增/编辑/删除） */
export function SupplierPage() {
  const [list, setList] = useState<Supplier[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  /** 首次加载完成前才显示骨架屏；之后的翻页/搜索保持表格挂载，只盖遮罩，避免闪一下 */
  const [booted, setBooted] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1)
  const [editing, setEditing] = useState<Partial<Supplier> | null>(null)
  const [deleting, setDeleting] = useState<Supplier | null>(null)
  const canAdd = hasPermission('supplier:add')
  const canEdit = hasPermission('supplier:update')
  const canDelete = hasPermission('supplier:delete')

  // 搜索走接口：输入停顿 300ms 再请求
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedKeyword(keyword.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [keyword])

  const load = useCallback(() => {
    setLoading(true)
    fetchSuppliers({ page, pageSize: PAGE_SIZE, keyword: appliedKeyword || undefined })
      .then(res => {
        setList(res.records ?? [])
        setTotal(res.total ?? 0)
      })
      .catch(() => toast.error('加载失败'))
      .finally(() => {
        setLoading(false)
        setBooted(true)
      })
  }, [page, appliedKeyword])

  useEffect(load, [load])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="text-base">供应商管理</CardTitle>
          <div className="flex items-center gap-2">
            <RefreshButton onClick={load} disabled={loading} spinning={loading} />
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                className="w-48 pl-8"
                placeholder="搜索"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
              />
            </div>
            {canAdd && (
              <Button size="sm" onClick={() => setEditing({})}>
                <Plus className="size-4" />
                新增
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!booted ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              {loading && (
                <div className="bg-background/60 absolute inset-0 z-10 flex items-center justify-center" aria-live="polite">
                  <Loader2 className="text-muted-foreground size-5 animate-spin" />
                </div>
              )}
              <table className="w-full">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="w-14 px-3 py-2 text-center font-medium">序号</th>
                    <th className="px-3 py-2 font-medium">供应商名称</th>
                    <th className="px-3 py-2 font-medium">联系人</th>
                    <th className="px-3 py-2 font-medium">级别</th>
                    <th className="px-3 py-2 font-medium">备注</th>
                    <th className="table-sticky-action w-24 px-3 py-2 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {list.map((row, index) => (
                    <tr key={row.id} className="hover:bg-muted/40">
                  <td className="text-muted-foreground px-3 py-2 text-center text-sm tabular-nums">{index + 1}</td>
                  <td className="px-3 py-2 text-sm">{row.name ?? '-'}</td>
                  <td className="px-3 py-2 text-sm">{row.contact ?? '-'}</td>
                  <td className="px-3 py-2 text-sm">{row.level ?? '-'}</td>
                  <td className="px-3 py-2 text-sm">{row.remark ?? '-'}</td>
                      <td className="table-sticky-action px-3 py-2">
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditing(row)}>
                              编辑
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="text-muted-foreground size-7" onClick={() => setDeleting(row)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {list.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-muted-foreground py-10 text-center text-sm">
                        暂无数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {!loading && total > 0 && (
            <div className="flex items-center justify-between border-t pt-3">
              <p className="text-muted-foreground text-xs">
                第 {page} / {pageCount} 页，共 {total} 条
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(p - 1, 1))}>
                  上一页
                </Button>
                <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage(p => p + 1)}>
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {editing !== null && (
        <SupplierFormDialog
          value={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={open => !open && setDeleting(null)}
        title="删除供应商"
        description={`确定删除供应商「${deleting?.name ?? deleting?.id}」吗？该操作不可恢复。`}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await deleteSupplier(deleting.id)
            toast.success('已删除')
            setDeleting(null)
            load()
          } catch (error) {
            toast.error(error instanceof Error ? error.message : '删除失败')
          }
        }}
      />
    </div>
  )
}

function SupplierFormDialog({
  value,
  onClose,
  onSaved
}: {
  value: Partial<Supplier>
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<Partial<Supplier>>(value)
  const [busy, setBusy] = useState(false)
  const isEdit = typeof value.id === 'number'

  const submit = () => {
    setBusy(true)
    const request = isEdit ? updateSupplier(value.id as number, form) : createSupplier(form)
    request
      .then(() => {
        toast.success(isEdit ? '已保存' : '已新增')
        onSaved()
      })
      .catch(error => toast.error(error instanceof Error ? error.message : '保存失败'))
      .finally(() => setBusy(false))
  }

  return (
    <div className="bg-black/50 fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background w-full max-w-lg rounded-xl border p-5" onClick={e => e.stopPropagation()}>
        <h3 className="mb-4 text-base font-medium">{isEdit ? '编辑供应商' : '新增供应商'}</h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs">供应商名称</label>
            <Input
              value={String(form.name ?? '')}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs">联系人</label>
            <Input
              value={String(form.contact ?? '')}
              onChange={e => setForm(prev => ({ ...prev, contact: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs">级别</label>
            <Input
              value={String(form.level ?? '')}
              onChange={e => setForm(prev => ({ ...prev, level: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs">备注</label>
            <Input
              value={String(form.remark ?? '')}
              onChange={e => setForm(prev => ({ ...prev, remark: e.target.value }))}
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? '保存中…' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  )
}
