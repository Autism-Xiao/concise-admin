import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Level, LevelStatus } from '../api'

interface LevelFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  level: Level | null
  onSubmit: (values: Omit<Level, 'id'>) => void
}

const emptyForm = { name: '', rank: 1, status: '正常' as LevelStatus, remark: '' }

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应职级 */
export function LevelFormDialog({ open, onOpenChange, level, onSubmit }: LevelFormDialogProps) {
  const [form, setForm] = useState(() => (level ? { name: level.name, rank: level.rank, status: level.status, remark: level.remark } : emptyForm))

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{level ? '编辑职级' : '新增职级'}</DialogTitle>
          <DialogDescription>{level ? '修改职级信息后保存' : '填写信息创建新职级'}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            onSubmit(form)
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="level-name">职级名称</Label>
            <Input id="level-name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="如 P6 / M1" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="level-rank">等级排序</Label>
            <Input id="level-rank" type="number" min={1} value={form.rank} onChange={e => set('rank', Number(e.target.value) || 1)} required />
          </div>
          <div className="space-y-2">
            <Label>状态</Label>
            <Select value={form.status} onValueChange={v => set('status', v as LevelStatus)} items={{ 正常: '正常', 停用: '停用' }}>
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
            <Label htmlFor="level-remark">备注</Label>
            <Input id="level-remark" value={form.remark} onChange={e => set('remark', e.target.value)} />
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
