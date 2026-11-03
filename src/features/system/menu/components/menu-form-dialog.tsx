import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Menu, MenuStatus } from '../api'

interface MenuFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  menu: Menu | null
  /** 新增时预选的上级菜单 id，null 为顶级 */
  parentId: number | null
  /** 全部菜单，用于选择上级 */
  menus: Menu[]
  onSubmit: (values: Omit<Menu, 'id'>) => void
}

/** 由路径推导上级菜单 id：/system/users 的上级是 path 为 /system 的菜单 */
function findParentId(menu: Menu, menus: Menu[]): number {
  const parentPath = menu.path.slice(0, menu.path.lastIndexOf('/'))
  return menus.find(m => m.path === parentPath)?.id ?? 0
}

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应菜单 */
export function MenuFormDialog({ open, onOpenChange, menu, parentId, menus, onSubmit }: MenuFormDialogProps) {
  const [form, setForm] = useState(() => {
    if (menu) {
      return { name: menu.name, path: menu.path, sort: menu.sort, status: menu.status, parentId: findParentId(menu, menus) }
    }
    const parent = menus.find(m => m.id === parentId)
    return { name: '', path: parent ? `${parent.path}/` : '/', sort: 1, status: '正常' as MenuStatus, parentId: parentId ?? 0 }
  })

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm(prev => ({ ...prev, [key]: value }))

  // 可选上级：编辑时排除自身及后代，避免形成环
  const parentOptions = menus.filter(m => !menu || (m.id !== menu.id && !m.path.startsWith(menu.path + '/')))
  const parentItems = { '0': '顶级菜单', ...Object.fromEntries(parentOptions.map(m => [String(m.id), `${m.name}（${m.path}）`])) }

  /** 切换上级时保留路径最后一段，拼到新父级路径下 */
  const changeParent = (value: string) => {
    const pid = Number(value)
    const parent = menus.find(m => m.id === pid)
    setForm(prev => {
      const seg = prev.path.replace(/\/+$/, '').split('/').pop() ?? ''
      return { ...prev, parentId: pid, path: parent ? `${parent.path}/${seg}` : `/${seg}` }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{menu ? '编辑菜单' : '新增菜单'}</DialogTitle>
          <DialogDescription>{menu ? '修改菜单信息后保存' : '填写信息创建新菜单'}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            onSubmit({ name: form.name.trim(), path: form.path.trim(), sort: form.sort, status: form.status })
          }}
        >
          <div className="space-y-2">
            <Label>上级菜单</Label>
            <Select value={String(form.parentId)} onValueChange={changeParent} items={parentItems}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">顶级菜单</SelectItem>
                {parentOptions.map(m => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name}（{m.path}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="menu-name">菜单名称</Label>
            <Input id="menu-name" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menu-path">路由地址</Label>
            <Input
              id="menu-path"
              value={form.path}
              onChange={e => set('path', e.target.value)}
              placeholder="/system/example"
              required
              pattern="/.*"
              title="以 / 开头"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="menu-sort">排序</Label>
              <Input id="menu-sort" type="number" min={1} value={form.sort} onChange={e => set('sort', Number(e.target.value))} required />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={form.status} onValueChange={v => set('status', v as MenuStatus)} items={{ 正常: '正常', 停用: '停用' }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="正常">正常</SelectItem>
                  <SelectItem value="停用">停用</SelectItem>
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
