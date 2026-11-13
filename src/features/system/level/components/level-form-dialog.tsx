import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Level, LevelWritePayload } from '../api'

interface LevelFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  level: Level | null
  onSubmit: (values: LevelWritePayload) => void
}

interface FormState {
  levelName: string
  levelRank: number
  status: string
  remark: string
}

const emptyForm: FormState = { levelName: '', levelRank: 1, status: '1', remark: '' }

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应职级 */
export function LevelFormDialog({ open, onOpenChange, level, onSubmit }: LevelFormDialogProps) {
  const [form, setForm] = useState<FormState>(() =>
    level ? { levelName: level.levelName, levelRank: level.levelRank, status: level.status, remark: level.remark ?? '' } : emptyForm
  )

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{level ? '编辑职级' : '新增职级'}</DialogTitle>
          <DialogDescription>{level ? '修改职级信息后保存' : '填写信息创建新职级'}</DialogDescription>
        </DialogHeader>
        <form
          id="level-form"
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            onSubmit({ levelName: form.levelName.trim(), levelRank: form.levelRank, status: form.status, remark: form.remark.trim() || null })
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="level-name">职级名称</Label>
            <Input id="level-name" value={form.levelName} onChange={e => set('levelName', e.target.value)} placeholder="如 P6 / M1" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="level-rank">等级排序（数字越大级别越高）</Label>
            <Input id="level-rank" type="number" min={1} value={form.levelRank} onChange={e => set('levelRank', Number(e.target.value) || 1)} required />
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
            <Label htmlFor="level-remark">备注</Label>
            <Input id="level-remark" value={form.remark} onChange={e => set('remark', e.target.value)} />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button form="level-form" type="submit">
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
