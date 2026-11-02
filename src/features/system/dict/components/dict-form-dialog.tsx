import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Dict, DictStatus } from '../data/dicts'

interface DictFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  dict: Dict | null
  onSubmit: (values: Omit<Dict, 'id'>) => void
}

const emptyForm = { name: '', type: '', status: '正常' as DictStatus, remark: '' }

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应字典 */
export function DictFormDialog({ open, onOpenChange, dict, onSubmit }: DictFormDialogProps) {
  const [form, setForm] = useState(() => (dict ? { name: dict.name, type: dict.type, status: dict.status, remark: dict.remark } : emptyForm))

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dict ? '编辑字典' : '新增字典'}</DialogTitle>
          <DialogDescription>{dict ? '修改字典信息后保存' : '填写信息创建新字典'}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            onSubmit(form)
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="dict-name">字典名称</Label>
            <Input id="dict-name" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dict-type">字典类型</Label>
            <Input id="dict-type" value={form.type} onChange={e => set('type', e.target.value)} placeholder="如 sys_notice_type" required />
          </div>
          <div className="space-y-2">
            <Label>状态</Label>
            <Select value={form.status} onValueChange={v => set('status', v as DictStatus)}>
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
            <Label htmlFor="dict-remark">备注</Label>
            <Input id="dict-remark" value={form.remark} onChange={e => set('remark', e.target.value)} />
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
