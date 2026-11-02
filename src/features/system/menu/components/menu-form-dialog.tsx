import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Menu, MenuStatus } from '../data/menus'

interface MenuFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  menu: Menu | null
  onSubmit: (values: Omit<Menu, 'id'>) => void
}

const emptyForm = { name: '', path: '', sort: 1, status: '正常' as MenuStatus }

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应菜单 */
export function MenuFormDialog({ open, onOpenChange, menu, onSubmit }: MenuFormDialogProps) {
  const [form, setForm] = useState(() => (menu ? { name: menu.name, path: menu.path, sort: menu.sort, status: menu.status } : emptyForm))

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => setForm(prev => ({ ...prev, [key]: value }))

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
            onSubmit(form)
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="menu-name">菜单名称</Label>
            <Input id="menu-name" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menu-path">路由地址</Label>
            <Input id="menu-path" value={form.path} onChange={e => set('path', e.target.value)} placeholder="/system/example" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="menu-sort">排序</Label>
              <Input id="menu-sort" type="number" min={1} value={form.sort} onChange={e => set('sort', Number(e.target.value))} required />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={form.status} onValueChange={v => set('status', v as MenuStatus)}>
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
