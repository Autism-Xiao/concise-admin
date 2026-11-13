import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDict } from '@/lib/dict'
import type { Tenant, TenantPlan, TenantStatus } from '../api'

interface TenantFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  tenant: Tenant | null
  /** 保存中：禁用按钮，避免重复提交 */
  submitting?: boolean
  onSubmit: (values: Omit<Tenant, 'id' | 'userCount'>) => void
}

const emptyForm = {
  name: '',
  code: '',
  contact: '',
  phone: '',
  plan: '试用版' as TenantPlan,
  beginDate: '',
  expireAt: '',
  status: '正常' as TenantStatus,
  remark: ''
}

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应租户 */
export function TenantFormDialog({ open, onOpenChange, tenant, submitting = false, onSubmit }: TenantFormDialogProps) {
  /** 套餐走字典 sys_tenant_plan */
  const planItems = useDict('sys_tenant_plan', { 试用版: '试用版', 标准版: '标准版', 企业版: '企业版' })
  const [form, setForm] = useState(() =>
    tenant
      ? {
          name: tenant.name,
          code: tenant.code,
          contact: tenant.contact,
          phone: tenant.phone,
          plan: tenant.plan,
          beginDate: tenant.beginDate,
          expireAt: tenant.expireAt,
          status: tenant.status,
          remark: tenant.remark
        }
      : emptyForm
  )

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 固定头尾由公共 DialogContent 默认接管：标题钉顶、按钮钉底、表单区独立滚动 */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tenant ? '编辑租户' : '新增租户'}</DialogTitle>
          <DialogDescription>{tenant ? '修改租户信息后保存' : '填写信息创建新租户'}</DialogDescription>
        </DialogHeader>
        <form
          id="tenant-form"
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            onSubmit(form)
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-name">租户名称</Label>
              <Input id="tenant-name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="如 云启科技" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-code">租户编码</Label>
              <Input id="tenant-code" value={form.code} onChange={e => set('code', e.target.value)} placeholder="如 YUNQI" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-contact">联系人</Label>
              <Input id="tenant-contact" value={form.contact} onChange={e => set('contact', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-phone">联系电话</Label>
              <Input id="tenant-phone" value={form.phone} onChange={e => set('phone', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>套餐</Label>
              <Select value={form.plan} onValueChange={v => set('plan', v as TenantPlan)} items={planItems}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(planItems).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-begin">开通日期</Label>
              <Input id="tenant-begin" type="date" value={form.beginDate} onChange={e => set('beginDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-expire">到期日期</Label>
              <Input id="tenant-expire" type="date" value={form.expireAt} onChange={e => set('expireAt', e.target.value)} />
              <p className="text-muted-foreground text-xs">留空表示永久有效</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>状态</Label>
            <Select value={form.status} onValueChange={v => set('status', v as TenantStatus)} items={{ 正常: '正常', 停用: '停用' }}>
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
            <Label htmlFor="tenant-remark">备注</Label>
            <Input id="tenant-remark" value={form.remark} onChange={e => set('remark', e.target.value)} />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="submit" form="tenant-form" disabled={submitting}>
            {submitting ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
