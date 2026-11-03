import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Role, RoleStatus } from '../api'

interface RoleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  role: Role | null
  onSubmit: (values: Pick<Role, 'name' | 'code' | 'status'>) => void
}

const emptyForm = { name: '', code: '', status: '正常' as RoleStatus }

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应角色 */
export function RoleFormDialog({ open, onOpenChange, role, onSubmit }: RoleFormDialogProps) {
  const [form, setForm] = useState(() => (role ? { name: role.name, code: role.code, status: role.status } : emptyForm))

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{role ? '编辑角色' : '新增角色'}</DialogTitle>
          <DialogDescription>{role ? '修改角色信息后保存' : '填写信息创建新角色'}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            onSubmit(form)
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="role-name">角色名称</Label>
            <Input id="role-name" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-code">权限字符</Label>
            <Input id="role-code" value={form.code} onChange={e => set('code', e.target.value)} placeholder="如 operator" required />
          </div>
          <div className="space-y-2">
            <Label>状态</Label>
            <Select value={form.status} onValueChange={v => set('status', v as RoleStatus)} items={{ 正常: '正常', 停用: '停用' }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="正常">正常</SelectItem>
                <SelectItem value="停用">停用</SelectItem>
              </SelectContent>
            </Select>
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
