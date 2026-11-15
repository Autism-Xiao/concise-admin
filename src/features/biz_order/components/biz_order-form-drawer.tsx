import { useState } from 'react'
import type { FormEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { AppDrawer } from '@/components/app-drawer'
import type { BizOrder, BizOrderWritePayload } from '../api'

interface BizOrderFormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 编辑对象；null 表示新增 */
  bizOrder: BizOrder | null
  onSubmit: (values: BizOrderWritePayload) => void
}

const toDatetimeInput = (value?: string | null) => (value ? String(value).slice(0, 16) : '')

/** 订单新增/编辑抽屉（生成器产物：AppDrawer 表单模式，回车提交、原生校验生效） */
export function BizOrderFormDrawer({ open, onOpenChange, bizOrder: editing, onSubmit }: BizOrderFormDrawerProps) {
  const [form, setForm] = useState<Partial<BizOrder>>(editing ?? {})
  const isEdit = editing !== null

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSubmit(form as BizOrderWritePayload)
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑订单' : '新增订单'}
      description={isEdit ? '修改后点击保存立即生效' : '填写完成后点击保存'}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title"><span className="text-destructive">*</span> 标题</Label>
          <Input
            id="title"
            required value={String(form.title ?? '')}
            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">状态</Label>
          <Select
            value={form.status !== undefined && form.status !== null ? String(form.status) : undefined}
            onValueChange={value => setForm(prev => ({ ...prev, status: Number(value) }))}
          >
            <SelectTrigger id="status" className="w-full">
              <SelectValue placeholder="请选择状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">启用</SelectItem>
              <SelectItem value="0">停用</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="amount">金额</Label>
          <Input
            id="amount"
            type="number"
            value={form.amount ?? ''}
            onChange={e => setForm(prev => ({ ...prev, amount: e.target.value === '' ? undefined : Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signedAt">签约时间</Label>
          <Input
            id="signedAt"
            type="datetime-local"
            value={toDatetimeInput(form.signedAt)}
            onChange={e => setForm(prev => ({ ...prev, signedAt: e.target.value || undefined }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="remark">备注</Label>
          <Textarea
            id="remark"
            rows={3}
            value={String(form.remark ?? '')}
            onChange={e => setForm(prev => ({ ...prev, remark: e.target.value || undefined }))}
          />
        </div>
      </div>
    </AppDrawer>
  )
}
