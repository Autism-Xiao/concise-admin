import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createTenantAdmin, type Tenant } from '../api'

interface TenantAdminDialogProps {
  tenant: Tenant
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 开通成功回调（父组件刷新列表，用户数会变） */
  onSaved: () => void
}

/**
 * 为租户开通管理员账号
 *
 * 为什么需要这个入口：用户名是**全局唯一**的，不能每个租户都叫 admin；
 * 而直接在「用户管理」建号时，平台视角下的新账号会被兜底到默认租户 1，
 * 必须先切租户再建，容易建错地方。这里把「建号 + 加入本租户 + 绑本租户 admin 角色」
 * 一次做完，账号名建议带上租户编码，方便区分。
 */
export function TenantAdminDialog({ tenant, open, onOpenChange, onSaved }: TenantAdminDialogProps) {
  const [form, setForm] = useState({ username: '', realname: '', password: '' })
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof typeof form>(key: K, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const submit = () => {
    setSaving(true)
    createTenantAdmin(tenant.id, {
      username: form.username.trim(),
      realname: form.realname.trim(),
      password: form.password
    })
      .then(() => {
        toast.success(`已为「${tenant.name}」开通管理员 ${form.username.trim()}`, {
          description: '初始密码只在此处展示，请线下告知对方并提醒首次登录后修改'
        })
        onOpenChange(false)
        onSaved()
      })
      .catch(error => toast.error(error instanceof Error ? error.message : '开通失败'))
      .finally(() => setSaving(false))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>开通租户管理员</DialogTitle>
          <DialogDescription>为「{tenant.name}」创建一个管理员账号，自动加入本租户并绑定该租户的管理员角色</DialogDescription>
        </DialogHeader>
        <form
          id="tenant-admin-form"
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            submit()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="tenant-admin-username">登录账号</Label>
            <Input
              id="tenant-admin-username"
              value={form.username}
              onChange={e => set('username', e.target.value)}
              placeholder={`如 admin_${tenant.code.toLowerCase()}`}
              minLength={3}
              maxLength={100}
              required
            />
            <p className="text-muted-foreground text-xs">账号全局唯一，不能与已有账号重名；建议带上租户编码</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-admin-realname">姓名</Label>
            <Input
              id="tenant-admin-realname"
              value={form.realname}
              onChange={e => set('realname', e.target.value)}
              placeholder="如 张三"
              maxLength={100}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-admin-password">初始密码</Label>
            <Input
              id="tenant-admin-password"
              type="password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="6~64 位"
              minLength={6}
              maxLength={64}
              required
            />
            <p className="text-muted-foreground text-xs">服务端哈希存储，创建后无法找回，只能重置</p>
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button form="tenant-admin-form" type="submit" disabled={saving}>
            {saving ? '开通中…' : '开通'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
