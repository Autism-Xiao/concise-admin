import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { isSuperRoleCode } from '@/lib/permissions'
import type { Role } from '../api'

export interface RoleFormValues {
  roleName: string
  roleCode: string
  description?: string
  dataScope?: number
  /** 状态：1 正常 / 0 停用 */
  status?: number
}

interface RoleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  role: Role | null
  onSubmit: (values: RoleFormValues) => void
}

const emptyForm = { roleName: '', roleCode: '', description: '', dataScope: 1, status: 1 }

/** 数据范围档位（与后端 sys_role.data_scope 对齐） */
const DATA_SCOPE_ITEMS = { 1: '全部数据', 2: '本部门及以下', 3: '仅本部门', 4: '仅本人' }

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应角色 */
export function RoleFormDialog({ open, onOpenChange, role, onSubmit }: RoleFormDialogProps) {
  const [form, setForm] = useState(() =>
    role
      ? {
          roleName: role.roleName ?? '',
          roleCode: role.roleCode,
          description: role.description ?? '',
          dataScope: role.dataScope ?? 1,
          status: role.status ?? 1
        }
      : emptyForm
  )

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{role ? '编辑角色' : '新增角色'}</DialogTitle>
          <DialogDescription>{role ? '角色编码创建后不建议修改（@Roles() 按它匹配）' : '填写信息创建新角色，授权可在列表中继续操作'}</DialogDescription>
        </DialogHeader>
        <form
          id="role-form"
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
            <Input id="role-desc" value={form.description} onChange={e => set('description', e.target.value)} placeholder="选填" />
          </div>
          <div className="space-y-2">
            <Label>数据范围</Label>
            <Select value={String(form.dataScope)} onValueChange={v => set('dataScope', Number(v))} items={DATA_SCOPE_ITEMS}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DATA_SCOPE_ITEMS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">控制该角色下用户能看到的业务数据范围（如用户列表只显示权限内的人）；超管角色不受限</p>
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <Label htmlFor="role-status">状态</Label>
              <p className="text-muted-foreground mt-0.5 text-xs">停用后该角色不再参与权限计算，也不能再分配给用户</p>
            </div>
            <Switch
              id="role-status"
              checked={form.status !== 0}
              disabled={role !== null && isSuperRoleCode(role.roleCode)}
              onCheckedChange={checked => set('status', checked ? 1 : 0)}
            />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button form="role-form" type="submit">
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
