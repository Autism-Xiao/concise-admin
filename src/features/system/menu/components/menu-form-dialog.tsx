import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Menu, MenuWritePayload } from '../api'
import { IconPicker } from './icon-picker'

interface MenuFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  menu: Menu | null
  /** 新增时预选的上级菜单 id，null 为顶级 */
  parentId: string | null
  /** 全部菜单，用于选择上级 */
  menus: Menu[]
  onSubmit: (values: MenuWritePayload) => void
}

interface FormState {
  parentId: string
  name: string
  menuType: number
  url: string
  component: string
  perms: string
  icon: string
  sortNo: number
  status: string
  hidden: number
  description: string
}

const emptyForm: FormState = { parentId: '', name: '', menuType: 1, url: '', component: '', perms: '', icon: '', sortNo: 1, status: '1', hidden: 0, description: '' }

/** 收集 menu 及其全部后代 id（上级下拉排除用，防环） */
function descendantIds(menu: Menu, menus: Menu[]): Set<string> {
  const byParent = new Map<string, string[]>()
  for (const m of menus) {
    if (m.parentId) {
      if (!byParent.has(m.parentId)) byParent.set(m.parentId, [])
      byParent.get(m.parentId)!.push(m.id)
    }
  }
  const out = new Set<string>([menu.id])
  const stack = [menu.id]
  while (stack.length) {
    const cur = stack.pop()!
    for (const child of byParent.get(cur) ?? []) {
      if (!out.has(child)) {
        out.add(child)
        stack.push(child)
      }
    }
  }
  return out
}

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应菜单 */
export function MenuFormDialog({ open, onOpenChange, menu, parentId, menus, onSubmit }: MenuFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => {
    if (menu) {
      return {
        parentId: menu.parentId ?? '',
        name: menu.name,
        menuType: menu.menuType,
        url: menu.url ?? '',
        component: menu.component ?? '',
        perms: menu.perms ?? '',
        icon: menu.icon ?? '',
        sortNo: menu.sortNo ?? 1,
        status: menu.status,
        hidden: menu.hidden ?? 0,
        description: menu.description ?? ''
      }
    }
    return { ...emptyForm, parentId: parentId ?? '', url: '' }
  })

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(prev => ({ ...prev, [key]: value }))

  // 可选上级：目录/菜单才能当父级；编辑时排除自身及后代，避免形成环
  const parentOptions = menus.filter(m => m.menuType !== 2 && (!menu || !descendantIds(menu, menus).has(m.id)))
  // Base UI 的触发器文本取自 items 映射（value→label），缺失会直接显示原始 id
  const parentItems: Record<string, string> = { _root: '顶级', ...Object.fromEntries(parentOptions.map(m => [m.id, m.name])) }
  const isButton = form.menuType === 2

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const values: MenuWritePayload = {
      name: form.name.trim(),
      menuType: form.menuType,
      parentId: form.parentId || null,
      url: isButton ? null : form.url.trim() || null,
      component: isButton || form.menuType === 0 ? null : form.component.trim() || null,
      perms: isButton ? form.perms.trim() || null : null,
      icon: form.icon.trim() || null,
      sortNo: form.sortNo,
      status: form.status,
      hidden: form.hidden,
      description: form.description.trim() || null
    }
    onSubmit(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{menu ? '编辑菜单' : '新增菜单'}</DialogTitle>
          <DialogDescription>{isButton ? '按钮权限只需名称与权限编码' : menu ? '修改菜单信息后保存' : '目录/菜单需填路由地址'}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>菜单类型</Label>
              <Select value={String(form.menuType)} onValueChange={v => set('menuType', Number(v))} items={{ 0: '目录', 1: '菜单', 2: '按钮' }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">目录</SelectItem>
                  <SelectItem value="1">菜单</SelectItem>
                  <SelectItem value="2">按钮</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>上级菜单</Label>
              <Select value={form.parentId || '_root'} onValueChange={v => set('parentId', v === '_root' ? '' : v)} items={parentItems}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_root">顶级</SelectItem>
                  {parentOptions.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="menu-name">名称</Label>
              <Input id="menu-name" value={form.name} onChange={e => set('name', e.target.value)} placeholder={isButton ? '如：用户新增' : '如：用户管理'} required />
            </div>
            {!isButton && (
              <div className="space-y-2">
                <Label htmlFor="menu-url">路由地址</Label>
                <Input id="menu-url" value={form.url} onChange={e => set('url', e.target.value)} placeholder="/system/example" pattern="/.*" title="以 / 开头" />
              </div>
            )}
            {isButton && (
              <div className="space-y-2">
                <Label htmlFor="menu-perms">权限编码</Label>
                <Input id="menu-perms" value={form.perms} onChange={e => set('perms', e.target.value)} placeholder="system:user:add" required />
              </div>
            )}
          </div>
          {!isButton && form.menuType === 1 && (
            <div className="space-y-2">
              <Label htmlFor="menu-component">前端组件路径（可选）</Label>
              <Input id="menu-component" value={form.component} onChange={e => set('component', e.target.value)} placeholder="system/user/index" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="menu-icon">图标（lucide 组件名，可选）</Label>
              <div className="flex items-center gap-2">
                <Input id="menu-icon" value={form.icon} onChange={e => set('icon', e.target.value)} placeholder="Users" className="flex-1" />
                <IconPicker value={form.icon.trim()} onChange={name => set('icon', name)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="menu-sort">排序（越小越靠前）</Label>
              <Input id="menu-sort" type="number" value={form.sortNo} onChange={e => set('sortNo', Number(e.target.value))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={form.status} onValueChange={v => set('status', v)} items={{ 1: '正常', 0: '停用' }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">正常</SelectItem>
                  <SelectItem value="0">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!isButton && (
              <div className="space-y-2">
                <Label>是否隐藏路由</Label>
                <Select value={String(form.hidden)} onValueChange={v => set('hidden', Number(v))} items={{ 0: '显示', 1: '隐藏' }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">显示</SelectItem>
                    <SelectItem value="1">隐藏</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="menu-desc">描述（可选）</Label>
            <Input id="menu-desc" value={form.description} onChange={e => set('description', e.target.value)} />
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
