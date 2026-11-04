import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Dict, DictItem, DictItemFormValues } from '../api'

interface DictItemFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 当前选中的字典（决定字典项归属） */
  dict: Dict
  /** null 表示新增 */
  item: DictItem | null
  onSubmit: (values: DictItemFormValues) => Promise<void>
}

const STATUS_LABELS: Record<string, string> = { '1': '启用', '0': '不启用' }

/** 字典项表单：文本 / 值 / 排序 / 状态 / 描述 */
export function DictItemFormDialog({ open, onOpenChange, dict, item, onSubmit }: DictItemFormDialogProps) {
  const [form, setForm] = useState<DictItemFormValues>(() => ({
    itemText: item?.itemText ?? '',
    itemValue: item?.itemValue ?? '',
    sortOrder: item?.sortOrder ?? 0,
    status: item?.status ?? 1,
    description: item?.description ?? ''
  }))
  const [submitting, setSubmitting] = useState(false)

  const set = <K extends keyof DictItemFormValues>(key: K, value: DictItemFormValues[K]) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? '编辑字典项' : '新增字典项'}</DialogTitle>
          <DialogDescription>
            所属字典：{dict.dictName}（<code className="text-xs">{dict.dictCode}</code>）
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async e => {
            e.preventDefault()
            setSubmitting(true)
            try {
              await onSubmit({
                ...form,
                sortOrder: Number(form.sortOrder) || 0,
                description: form.description?.trim() || undefined
              })
            } finally {
              setSubmitting(false)
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="item-text">字典项文本</Label>
            <Input id="item-text" value={form.itemText} onChange={e => set('itemText', e.target.value)} placeholder="如 男" required maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-value">字典项值</Label>
            <Input id="item-value" value={form.itemValue} onChange={e => set('itemValue', e.target.value)} placeholder="如 1" required maxLength={100} />
            <p className="text-muted-foreground text-xs">存库用的值，同一字典下不可重复</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="item-sort">排序</Label>
              <Input
                id="item-sort"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={e => set('sortOrder', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={String(form.status)} onValueChange={v => set('status', Number(v))} items={STATUS_LABELS}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">启用</SelectItem>
                  <SelectItem value="0">不启用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-description">描述</Label>
            <Input id="item-description" value={form.description ?? ''} onChange={e => set('description', e.target.value)} maxLength={255} />
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
