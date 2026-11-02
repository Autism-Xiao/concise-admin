import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Dept } from '../data/depts'

export interface DeptFormValues {
  name: string
  leader: string
  sort: number
  /** null 表示顶级部门 */
  parentId: number | null
}

interface DeptFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  dept: Dept | null
  /** 可选上级部门列表（编辑时已排除自身） */
  depts: Dept[]
  onSubmit: (values: DeptFormValues) => void
}

const emptyForm: DeptFormValues = { name: '', leader: '', sort: 1, parentId: null }

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应部门 */
export function DeptFormDialog({ open, onOpenChange, dept, depts, onSubmit }: DeptFormDialogProps) {
  const [form, setForm] = useState<DeptFormValues>(() =>
    dept ? { name: dept.name, leader: dept.leader, sort: dept.sort, parentId: dept.parentId } : emptyForm
  )

  const set = <K extends keyof DeptFormValues>(key: K, value: DeptFormValues[K]) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dept ? '编辑部门' : '新增部门'}</DialogTitle>
          <DialogDescription>{dept ? '修改部门信息后保存' : '填写信息创建新部门'}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            onSubmit(form)
          }}
        >
          <div className="space-y-2">
            <Label>上级部门</Label>
            <Select
              value={form.parentId == null ? 'none' : String(form.parentId)}
              onValueChange={v => set('parentId', v === 'none' ? null : Number(v))}
              items={{ none: '无（顶级部门）', ...Object.fromEntries(depts.map(d => [String(d.id), d.name])) }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无（顶级部门）</SelectItem>
                {depts.map(d => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dept-name">部门名称</Label>
            <Input id="dept-name" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dept-leader">负责人</Label>
              <Input id="dept-leader" value={form.leader} onChange={e => set('leader', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-sort">排序</Label>
              <Input id="dept-sort" type="number" min={1} value={form.sort} onChange={e => set('sort', Number(e.target.value))} required />
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
