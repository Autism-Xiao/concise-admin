import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { User, UserRole, UserStatus } from '../data/users'

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  user: User | null
  onSubmit: (values: Omit<User, 'id' | 'createdAt'>) => void
}

const emptyForm = { name: '', username: '', email: '', phone: '', status: 'active' as UserStatus, role: 'cashier' as UserRole }

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应用户 */
export function UserFormDialog({ open, onOpenChange, user, onSubmit }: UserFormDialogProps) {
  const [form, setForm] = useState(() =>
    user ? { name: user.name, username: user.username, email: user.email, phone: user.phone, status: user.status, role: user.role } : emptyForm
  )

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? '编辑用户' : '新增用户'}</DialogTitle>
          <DialogDescription>{user ? '修改用户信息后保存' : '填写信息创建新用户'}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            onSubmit(form)
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input id="name" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input id="username" value={form.username} onChange={e => set('username', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">手机号</Label>
            <Input id="phone" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>角色</Label>
              <Select
                value={form.role}
                onValueChange={v => set('role', v as UserRole)}
                items={{ superadmin: '超级管理员', admin: '管理员', manager: '经理', cashier: '收银' }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="superadmin">超级管理员</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                  <SelectItem value="manager">经理</SelectItem>
                  <SelectItem value="cashier">收银</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select
                value={form.status}
                onValueChange={v => set('status', v as UserStatus)}
                items={{ active: '活跃', inactive: '未激活', invited: '已邀请', suspended: '已停用' }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">活跃</SelectItem>
                  <SelectItem value="inactive">未激活</SelectItem>
                  <SelectItem value="invited">已邀请</SelectItem>
                  <SelectItem value="suspended">已停用</SelectItem>
                </SelectContent>
              </Select>
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
