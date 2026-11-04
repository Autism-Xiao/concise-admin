import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Role } from '../api'

export interface RoleFormValues {
  roleName: string
  roleCode: string
  description?: string
}

interface RoleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  role: Role | null
  onSubmit: (values: RoleFormValues) => void
}

const emptyForm = { roleName: '', roleCode: '', description: '' }

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应角色 */
export function RoleFormDialog({ open, onOpenChange, role, onSubmit }: RoleFormDialogProps) {
  const [form, setForm] = useState(() =>
    role ? { roleName: role.roleName ?? '', roleCode: role.roleCode, description: role.description ?? '' } : emptyForm
  )

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{role ? '编辑角色' : '新增角色'}</DialogTitle>
          <DialogDescription>
            {role ? '角色编码创建后不建议修改（@Roles() 按它匹配）' : '填写信息创建新角色，授权可在列表中继续操作'}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            onSubmit({ ...form, description: form.description || undefined })
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="role-name">角色名称</Label>
            <Input id="role-name" value={form.roleName} onChange={e => set('roleName', e.target.value)} placeholder="如 运营" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-code">权限字符</Label>
            <Input
              id="role-code"
              value={form.roleCode}
              onChange={e => set('roleCode', e.target.value)}
              placeholder="如 operator（英文唯一）"
              required
              minLength={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-desc">描述</Label>
            <Input
              id="role-desc"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="选填"
            />
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
