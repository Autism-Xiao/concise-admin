import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Dict, DictFormValues } from '../api'

interface DictFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  dict: Dict | null
  onSubmit: (values: DictFormValues) => Promise<void>
}

const TYPE_LABELS: Record<string, string> = { '0': '字符串（string）', '1': '数字（number）' }

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应字典 */
export function DictFormDialog({ open, onOpenChange, dict, onSubmit }: DictFormDialogProps) {
  const [form, setForm] = useState<DictFormValues>(() => ({
    dictName: dict?.dictName ?? '',
    dictCode: dict?.dictCode ?? '',
    type: dict?.type ?? 0,
    description: dict?.description ?? ''
  }))
  const [submitting, setSubmitting] = useState(false)

  const set = <K extends keyof DictFormValues>(key: K, value: DictFormValues[K]) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dict ? '编辑字典' : '新增字典'}</DialogTitle>
          <DialogDescription>{dict ? '修改字典信息后保存' : '字典创建后可继续为它添加字典项'}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async e => {
            e.preventDefault()
            setSubmitting(true)
            try {
              await onSubmit({ ...form, description: form.description?.trim() || undefined })
            } finally {
              setSubmitting(false)
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="dict-name">字典名称</Label>
            <Input id="dict-name" value={form.dictName} onChange={e => set('dictName', e.target.value)} placeholder="如 用户性别" required maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dict-code">字典编码</Label>
            <Input id="dict-code" value={form.dictCode} onChange={e => set('dictCode', e.target.value)} placeholder="如 sys_user_gender" required maxLength={100} />
            <p className="text-muted-foreground text-xs">唯一标识，字母开头，前端按此编码取字典项</p>
          </div>
          <div className="space-y-2">
            <Label>值类型</Label>
            <Select value={String(form.type)} onValueChange={v => set('type', Number(v))} items={TYPE_LABELS}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">字符串（string）</SelectItem>
                <SelectItem value="1">数字（number）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dict-description">描述</Label>
            <Input id="dict-description" value={form.description ?? ''} onChange={e => set('description', e.target.value)} maxLength={255} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
