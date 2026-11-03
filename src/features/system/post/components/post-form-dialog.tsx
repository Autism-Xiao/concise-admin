import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Post, PostStatus } from '../api'

interface PostFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  post: Post | null
  onSubmit: (values: Omit<Post, 'id'>) => void
}

const emptyForm = { name: '', code: '', dept: '', status: '正常' as PostStatus, remark: '' }

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应岗位 */
export function PostFormDialog({ open, onOpenChange, post, onSubmit }: PostFormDialogProps) {
  const [form, setForm] = useState(() => (post ? { name: post.name, code: post.code, dept: post.dept, status: post.status, remark: post.remark } : emptyForm))

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{post ? '编辑岗位' : '新增岗位'}</DialogTitle>
          <DialogDescription>{post ? '修改岗位信息后保存' : '填写信息创建新岗位'}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            onSubmit(form)
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="post-name">岗位名称</Label>
            <Input id="post-name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="如 前端工程师" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="post-code">岗位编码</Label>
            <Input id="post-code" value={form.code} onChange={e => set('code', e.target.value)} placeholder="如 FE" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="post-dept">所属部门</Label>
            <Input id="post-dept" value={form.dept} onChange={e => set('dept', e.target.value)} placeholder="如 研发部" required />
          </div>
          <div className="space-y-2">
            <Label>状态</Label>
            <Select value={form.status} onValueChange={v => set('status', v as PostStatus)} items={{ 正常: '正常', 停用: '停用' }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="正常">正常</SelectItem>
                <SelectItem value="停用">停用</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="post-remark">备注</Label>
            <Input id="post-remark" value={form.remark} onChange={e => set('remark', e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit">保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
