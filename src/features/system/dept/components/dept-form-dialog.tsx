import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Dept, DeptWritePayload } from '../api'

interface DeptFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  dept: Dept | null
  /** 新增时预选的上级部门 id，null 为顶级 */
  parentId: string | null
  /** 可选上级部门列表（编辑时已排除自身及后代） */
  depts: Dept[]
  onSubmit: (values: DeptWritePayload) => void
}

interface FormState {
  departName: string
  /** null 表示顶级部门 */
  parentId: string | null
  departOrder: number
  description: string
}

const emptyForm: FormState = { departName: '', parentId: null, departOrder: 0, description: '' }

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应部门 */
export function DeptFormDialog({ open, onOpenChange, dept, parentId, depts, onSubmit }: DeptFormDialogProps) {
  const [form, setForm] = useState<FormState>(() =>
    dept
      ? { departName: dept.departName, parentId: dept.parentId, departOrder: dept.departOrder, description: dept.description ?? '' }
      : { ...emptyForm, parentId: parentId ?? null }
  )

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(prev => ({ ...prev, [key]: value }))

  const deptItems = useMemo(() => ({ none: '无（顶级部门）', ...Object.fromEntries(depts.map(d => [d.id, d.departName])) }), [depts])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dept ? '编辑部门' : '新增部门'}</DialogTitle>
          <DialogDescription>{dept ? '修改部门信息后保存；更换上级会同步更新部门编码' : '填写信息创建新部门，部门编码由后端自动生成'}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            onSubmit({
              departName: form.departName.trim(),
              parentId: form.parentId,
              departOrder: form.departOrder,
              description: form.description.trim() || null
            })
          }}
        >
          <div className="space-y-2">
            <Label>上级部门</Label>
            <Select value={form.parentId ?? 'none'} onValueChange={v => set('parentId', v === 'none' ? null : v)} items={deptItems}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无（顶级部门）</SelectItem>
                {depts.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.departName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dept-name">部门名称</Label>
            <Input id="dept-name" value={form.departName} onChange={e => set('departName', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dept-sort">排序（越小越靠前）</Label>
              <Input id="dept-sort" type="number" min={0} value={form.departOrder} onChange={e => set('departOrder', Number(e.target.value))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-desc">描述（可选）</Label>
              <Input id="dept-desc" value={form.description} onChange={e => set('description', e.target.value)} placeholder="如：负责人：王总" />
            </div>
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
