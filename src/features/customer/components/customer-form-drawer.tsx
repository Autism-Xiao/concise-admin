import { useState } from 'react'
import type { FormEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { AppDrawer } from '@/components/app-drawer'
import type { Customer, CustomerWritePayload } from '../api'

interface CustomerFormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 编辑对象；null 表示新增 */
  customer: Customer | null
  onSubmit: (values: CustomerWritePayload) => void
}

/** 客户新增/编辑抽屉（生成器产物：AppDrawer 表单模式，回车提交、原生校验生效） */
export function CustomerFormDrawer({ open, onOpenChange, customer: editing, onSubmit }: CustomerFormDrawerProps) {
  const [form, setForm] = useState<Partial<Customer>>(editing ?? {})
  const isEdit = editing !== null

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSubmit(form as CustomerWritePayload)
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? '编辑客户' : '新增客户'}
      description={isEdit ? '修改后点击保存立即生效' : '填写完成后点击保存'}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name"><span className="text-destructive">*</span> 客户名称</Label>
          <Input
            id="name"
            required value={String(form.name ?? '')}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact">联系人</Label>
          <Input
            id="contact"
            value={String(form.contact ?? '')}
            onChange={e => setForm(prev => ({ ...prev, contact: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">电话</Label>
          <Input
            id="phone"
            value={String(form.phone ?? '')}
            onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="level">级别</Label>
          <Input
            id="level"
            type="number"
            value={form.level ?? ''}
            onChange={e => setForm(prev => ({ ...prev, level: e.target.value === '' ? undefined : Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vip">客户等级</Label>
          <Select
            value={form.vip !== undefined && form.vip !== null ? String(form.vip) : undefined}
            onValueChange={value => setForm(prev => ({ ...prev, vip: Number(value) }))}
          >
            <SelectTrigger id="vip" className="w-full">
              <SelectValue placeholder="请选择客户等级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">普通</SelectItem>
              <SelectItem value="1">VIP</SelectItem>
            </SelectContent>
          </Select>
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
