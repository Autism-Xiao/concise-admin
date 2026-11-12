import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from 'cn'
import { derivePermsPrefix, PERM_NODE_POOL, type Menu, type MenuWritePayload, type PermNode } from '../api'
import { IconPicker } from './icon-picker'
import { PermNodesTransfer } from './perm-nodes-transfer'

interface MenuFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  menu: Menu | null
  /** 新增时预选的上级菜单 id，null 为顶级 */
  parentId: string | null
  /** 全部菜单，用于选择上级与初始化已赋予按钮节点 */
  menus: Menu[]
  /** 保存：values 为菜单本体，permNodes 为穿梭框右栏（仅在目录/菜单类型下非空） */
  onSubmit: (values: MenuWritePayload, permNodes: PermNode[]) => void
}

interface FormState {
  parentId: string
  name: string
  menuType: number
  /** 打开方式：component 组件路由 / inner 内链 iframe / external 外部新窗口 */
  openMode: 'component' | 'inner' | 'external'
  url: string
  component: string
  perms: string
  icon: string
  sortNo: number
  status: string
  hidden: number
  description: string
}

const emptyForm: FormState = {
  parentId: '',
  name: '',
  menuType: 1,
  openMode: 'component',
  url: '',
  component: '',
  perms: '',
  icon: '',
  sortNo: 0,
  status: '1',
  hidden: 0,
  description: ''
}

/** 打开方式 → 实体字段映射：isRoute 是否路由菜单，internalOrExternal 是否外链 */
function resolveOpenMode(menu: Menu | null): FormState['openMode'] {
  if (!menu) return 'component'
  if (menu.internalOrExternal === 1) return 'external'
  if (menu.isRoute === 0) return 'inner'
  return 'component'
}

/** 单行单选组（原生 radio，横向排列） */
function RadioLine<T extends string | number>({
  value,
  options,
  onChange,
  className
}: {
  value: T
  options: Array<{ value: T; label: string; hint?: string }>
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={cn('flex h-9 flex-wrap items-center gap-x-5 gap-y-1', className)}>
      {options.map(opt => (
        <label key={String(opt.value)} className="flex cursor-pointer items-center gap-1.5 text-sm">
          <input type="radio" className="accent-primary size-3.5 cursor-pointer" checked={value === opt.value} onChange={() => onChange(opt.value)} />
          <span>{opt.label}</span>
          {opt.hint && <span className="text-muted-foreground text-xs">{opt.hint}</span>}
        </label>
      ))}
    </div>
  )
}

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应菜单 */
export function MenuFormDialog({ open, onOpenChange, menu, parentId, menus, onSubmit }: MenuFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => {
    if (menu) {
      return {
        parentId: menu.parentId ?? '',
        name: menu.name,
        menuType: menu.menuType,
        openMode: resolveOpenMode(menu),
        url: menu.url ?? '',
        component: menu.component ?? '',
        perms: menu.perms ?? '',
        icon: menu.icon ?? '',
        sortNo: menu.sortNo ?? 0,
        status: menu.status,
        hidden: menu.hidden ?? 0,
        description: menu.description ?? ''
      }
    }
    return { ...emptyForm, parentId: parentId ?? '' }
  })

  // 穿梭框右栏：编辑时用该菜单下既有的按钮子级初始化（全量替换语义下，不带回就会误删）
  const [permNodes, setPermNodes] = useState<PermNode[]>(() => {
    if (!menu) return []
    return menus
      .filter(m => m.parentId === menu.id && m.menuType === 2 && (m.delFlag ?? 0) === 0 && m.perms)
      .map(m => ({ name: m.name, perms: m.perms! }))
  })

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(prev => ({ ...prev, [key]: value }))

  // 可选上级：目录/菜单才能当父级；编辑时排除自身及后代，避免形成环
  const parentOptions = menus.filter(m => m.menuType !== 2 && (!menu || !descendantIds(menu, menus).has(m.id)))
  // Base UI 的触发器文本取自 items 映射（value→label），缺失会直接显示原始 id
  const parentItems: Record<string, string> = { _root: '顶级', ...Object.fromEntries(parentOptions.map(m => [m.id, m.name])) }
  const isButton = form.menuType === 2
  const isExternal = form.openMode === 'external'

  // 权限节点池：perms 前缀由路由地址推导（/system/user + add → system:user:add）
  const permsPrefix = derivePermsPrefix(form.url)
  const grantedPerms = new Set(permNodes.map(n => n.perms))
  const pool: PermNode[] = permsPrefix
    ? PERM_NODE_POOL.map(({ name, action }) => ({ name, perms: `${permsPrefix}:${action}` })).filter(n => !grantedPerms.has(n.perms))
    : []
  const shuttleHint = permsPrefix ? undefined : '请先填写路由地址，权限标识将由路由地址自动生成'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const values: MenuWritePayload = {
      name: form.name.trim(),
      menuType: form.menuType,
      parentId: form.parentId || null,
      url: isButton ? null : form.url.trim() || null,
      component: isButton || form.menuType === 0 || isExternal ? null : form.component.trim() || null,
      perms: isButton ? form.perms.trim() || null : null,
      icon: form.icon.trim() || null,
      sortNo: form.sortNo,
      status: form.status,
      hidden: form.hidden,
      description: form.description.trim() || null,
      isRoute: isButton || form.menuType === 0 ? 1 : form.openMode === 'component' ? 1 : 0,
      internalOrExternal: !isButton && isExternal ? 1 : 0
    }
    onSubmit(values, isButton ? [] : permNodes)
  }

  const field = 'space-y-2'
  const inputBox = 'space-y-2'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{menu ? '修改菜单' : '新增菜单'}</DialogTitle>
          <DialogDescription>{isButton ? '按钮权限只需名称与权限标识' : '配置菜单路由与按钮权限节点'}</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div className={field}>
              <Label>上级菜单</Label>
              <Select value={form.parentId || '_root'} onValueChange={v => set('parentId', v === '_root' ? '' : v)} items={parentItems}>
                <SelectTrigger className="w-full">
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
            <div className={field}>
              <Label>菜单类型</Label>
              <RadioLine
                value={form.menuType}
                options={[
                  { value: 0, label: '目录' },
                  { value: 1, label: '菜单' },
                  { value: 2, label: '按钮' }
                ]}
                onChange={v => set('menuType', v)}
              />
            </div>

            <div className={inputBox}>
              <Label htmlFor="menu-name">
                <span className="text-destructive">*</span> 菜单名称
              </Label>
              <Input id="menu-name" value={form.name} onChange={e => set('name', e.target.value)} placeholder={isButton ? '如：用户新增' : '如：用户管理'} required />
            </div>
            {!isButton && (
              <div className={field}>
                <Label>打开方式</Label>
                <RadioLine
                  value={form.openMode}
                  options={[
                    { value: 'component', label: '组件' },
                    { value: 'inner', label: '内链', hint: 'iframe 嵌入' },
                    { value: 'external', label: '外链', hint: '新窗口' }
                  ]}
                  onChange={v => set('openMode', v)}
                />
              </div>
            )}

            <div className={inputBox}>
              <Label htmlFor="menu-icon">菜单图标</Label>
              <div className="flex items-center gap-2">
                <Input id="menu-icon" value={form.icon} onChange={e => set('icon', e.target.value)} placeholder="如 Users" className="flex-1" />
                <IconPicker value={form.icon.trim()} onChange={name => set('icon', name)} />
              </div>
            </div>
            <div className={inputBox}>
              <Label htmlFor="menu-perms">权限标识</Label>
              <Input id="menu-perms" value={form.perms} onChange={e => set('perms', e.target.value)} placeholder={isButton ? '如 system:user:add' : '可选'} />
            </div>

            {!isButton && (
              <div className={inputBox}>
                <Label htmlFor="menu-url">路由地址{isExternal && <span className="text-muted-foreground text-xs">（完整 http/https 地址）</span>}</Label>
                <Input
                  id="menu-url"
                  value={form.url}
                  onChange={e => set('url', e.target.value)}
                  placeholder={isExternal ? 'https://example.com' : '/system/example'}
                  required={isExternal}
                />
              </div>
            )}
            <div className={inputBox}>
              <Label htmlFor="menu-sort">
                <span className="text-destructive">*</span> 排序号
              </Label>
              <Input id="menu-sort" type="number" value={form.sortNo} onChange={e => set('sortNo', Number(e.target.value))} required />
            </div>

            {!isButton && !isExternal && (
              <div className={inputBox}>
                <Label htmlFor="menu-component">组件路径</Label>
                <Input id="menu-component" value={form.component} onChange={e => set('component', e.target.value)} placeholder="如 system/user/index" />
              </div>
            )}
            {!isButton && (
              <div className={field}>
                <Label>
                  是否可见
                  <span
                    className="text-muted-foreground ms-1 inline-flex size-4 cursor-help items-center justify-center rounded-full bg-muted text-[10px]"
                    title="隐藏后不在侧边栏出现，但仍可直接通过 URL 访问"
                  >
                    ?
                  </span>
                </Label>
                <RadioLine
                  value={form.hidden}
                  options={[
                    { value: 0, label: '显示' },
                    { value: 1, label: '隐藏' }
                  ]}
                  onChange={v => set('hidden', v)}
                />
              </div>
            )}
          </div>

          <div className={field}>
            <Label>状态</Label>
            <RadioLine
              value={form.status}
              options={[
                { value: '1', label: '启用' },
                { value: '0', label: '停用' }
              ]}
              onChange={v => set('status', v)}
            />
          </div>

          {!isButton && (
            <div className={field}>
              <Label>权限节点</Label>
              <PermNodesTransfer pool={pool} granted={permNodes} onChange={setPermNodes} disabledHint={shuttleHint} />
              <p className="text-muted-foreground text-xs">
                {permsPrefix
                  ? '权限标识由路由地址自动生成；保存时按右栏全量替换该菜单下的按钮权限（移出即删除对应按钮）。'
                  : '填写路由地址后，可从标准节点池（查询/添加/修改…）一键赋予按钮权限。'}
              </p>
            </div>
          )}

          <div className={inputBox}>
            <Label htmlFor="menu-desc">备注</Label>
            <textarea
              id="menu-desc"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="请输入备注"
              rows={3}
              className="ring-foreground/10 focus-visible:ring-primary/50 placeholder:text-muted-foreground w-full rounded-md px-3 py-2 text-sm ring-1 outline-none focus-visible:ring-2"
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
