import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fetchDepts, type Dept } from '@/features/system/dept/api'
import type { Post, PostWritePayload } from '../api'

interface PostFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  post: Post | null
  onSubmit: (values: PostWritePayload) => void
}

interface FormState {
  postName: string
  postCode: string
  postSort: number
  /** '' 表示不选部门 */
  deptId: string
  status: string
  description: string
}

const emptyForm: FormState = { postName: '', postCode: '', postSort: 1, deptId: '', status: '1', description: '' }

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应岗位 */
export function PostFormDialog({ open, onOpenChange, post, onSubmit }: PostFormDialogProps) {
  const [form, setForm] = useState<FormState>(() =>
    post
      ? {
          postName: post.postName,
          postCode: post.postCode,
          postSort: post.postSort,
          deptId: post.deptId ?? '',
          status: post.status,
          description: post.description ?? ''
        }
      : emptyForm
  )
  const [depts, setDepts] = useState<Dept[]>([])

  // 弹窗打开时拉一次真实部门列表用于下拉选择
  useEffect(() => {
    fetchDepts()
      .then(setDepts)
      .catch(() => {
        // 部门加载失败时仍可保存无部门的岗位
      })
  }, [])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(prev => ({ ...prev, [key]: value }))

  const deptItems = useMemo(() => ({ none: '无（不选部门）', ...Object.fromEntries(depts.map(d => [d.id, d.departName])) }), [depts])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{post ? '编辑岗位' : '新增岗位'}</DialogTitle>
          <DialogDescription>{post ? '修改岗位信息后保存' : '填写信息创建新岗位'}</DialogDescription>
        </DialogHeader>
        <form
          id="post-form"
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            onSubmit({
              postName: form.postName.trim(),
              postCode: form.postCode.trim(),
              postSort: form.postSort,
              deptId: form.deptId || null,
              status: form.status,
              description: form.description.trim() || null
            })
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="post-name">岗位名称</Label>
              <Input id="post-name" value={form.postName} onChange={e => set('postName', e.target.value)} placeholder="如 前端工程师" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-code">岗位编码</Label>
              <Input id="post-code" value={form.postCode} onChange={e => set('postCode', e.target.value)} placeholder="如 FE" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>所属部门</Label>
              <Select value={form.deptId || 'none'} onValueChange={v => set('deptId', v === 'none' ? '' : v)} items={deptItems}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无（不选部门）</SelectItem>
                  {depts.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.departName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-sort">排序（越小越靠前）</Label>
              <Input id="post-sort" type="number" min={1} value={form.postSort} onChange={e => set('postSort', Number(e.target.value) || 1)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>状态</Label>
            <Select value={form.status} onValueChange={v => set('status', v)} items={{ 1: '正常', 0: '停用' }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">正常</SelectItem>
                <SelectItem value="0">停用</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="post-desc">描述</Label>
            <Input id="post-desc" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button form="post-form" type="submit">
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
