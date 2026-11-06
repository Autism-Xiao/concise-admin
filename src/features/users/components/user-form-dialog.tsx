import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchBackendDepts,
  fetchRoleOptions,
  type Role,
  type User,
  type UserWritePayload
} from '../api'
import { fetchPosts, type Post } from '@/features/system/post/api'

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null 表示新增 */
  user: User | null
  onSubmit: (values: UserWritePayload) => void
}

interface FormState {
  username: string
  realname: string
  password: string
  email: string
  phone: string
  workNo: string
  sex: number
  status: number
  roleIds: string[]
  deptIds: string[]
  postIds: string[]
  /** YYYY-MM-DD；空串 = 不限制 */
  passwordExpireAt: string
  mustChangePassword: number
}

const emptyForm: FormState = { username: '', realname: '', password: '', email: '', phone: '', workNo: '', sex: 0, status: 1, roleIds: [], deptIds: [], postIds: [], passwordExpireAt: '', mustChangePassword: 0 }

/** 复选框列表（角色/部门多选） */
function CheckList({
  options,
  selected,
  onToggle
}: {
  options: Array<{ id: string; label: string }>
  selected: string[]
  onToggle: (id: string) => void
}) {
  if (!options.length) return <p className="text-muted-foreground text-sm">暂无可选项</p>
  return (
    <div className="max-h-36 space-y-1.5 overflow-y-auto rounded-md border p-2">
      {options.map(o => (
        <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-accent">
          <input type="checkbox" className="accent-primary" checked={selected.includes(o.id)} onChange={() => onToggle(o.id)} />
          {o.label}
        </label>
      ))}
    </div>
  )
}

/** 由父组件按 key 控制重挂载，保证打开时表单初始化为对应用户 */
export function UserFormDialog({ open, onOpenChange, user, onSubmit }: UserFormDialogProps) {
  const [form, setForm] = useState<FormState>(() =>
    user
      ? {
          username: user.username,
          realname: user.realname ?? '',
          password: '',
          email: user.email ?? '',
          phone: user.phone ?? '',
          workNo: user.workNo ?? '',
          sex: user.sex ?? 0,
          status: user.status,
          roleIds: (user.roles ?? []).map(r => r.id),
          deptIds: (user.depts ?? []).map(d => d.id),
          postIds: (user.posts ?? []).map(p => p.id),
          passwordExpireAt: user.passwordExpireAt ? user.passwordExpireAt.slice(0, 10) : '',
          mustChangePassword: user.mustChangePassword ?? 0
        }
      : emptyForm
  )
  const [roles, setRoles] = useState<Role[] | null>(null)
  const [depts, setDepts] = useState<Array<{ id: string; departName: string }> | null>(null)
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 弹窗打开时拉角色/部门/岗位下拉数据（每次挂载拉一次，数据量小）
  useEffect(() => {
    Promise.all([fetchRoleOptions(), fetchBackendDepts(), fetchPosts().catch(() => [])])
      .then(([r, d, p]) => {
        setRoles(r)
        setDepts(d)
        setPosts(p)
      })
      .catch(e => setLoadError(e instanceof Error ? e.message : '加载角色/部门失败'))
  }, [])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(prev => ({ ...prev, [key]: value }))

  const toggle = (key: 'roleIds' | 'deptIds' | 'postIds', id: string) =>
    setForm(prev => ({ ...prev, [key]: prev[key].includes(id) ? prev[key].filter(v => v !== id) : [...prev[key], id] }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user && form.password.length < 6) return // 新增时密码必填，靠原生 required 双保险
    setSubmitting(true)
    // 编辑时 password 留空表示不改密码；username 后端不可改，编辑时不下发
    const base = {
      realname: form.realname,
      email: form.email || undefined,
      phone: form.phone || undefined,
      workNo: form.workNo || undefined,
      sex: form.sex,
      status: form.status,
      roleIds: form.roleIds,
      deptIds: form.deptIds,
      postIds: form.postIds,
      // 密码有效期：清空日期 = 清除过期限制
      passwordExpireAt: form.passwordExpireAt || null,
      mustChangePassword: form.mustChangePassword,
      ...(form.password ? { password: form.password } : {})
    }
    const payload: UserWritePayload = user ? base : { username: form.username, ...base }
    Promise.resolve(onSubmit(payload)).finally(() => setSubmitting(false))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? '编辑用户' : '新增用户'}</DialogTitle>
          <DialogDescription>{user ? '账号不可修改；密码留空表示不修改' : '填写信息创建新用户'}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">账号</Label>
              <Input id="username" value={form.username} onChange={e => set('username', e.target.value)} disabled={!!user} required minLength={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="realname">姓名</Label>
              <Input id="realname" value={form.realname} onChange={e => set('realname', e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{user ? '重置密码（留空不改）' : '初始密码'}</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder={user ? '留空表示不修改密码' : '至少 6 位'}
              required={!user}
              minLength={user ? 0 : 6}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">手机号</Label>
              <Input id="phone" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workNo">工号</Label>
              <Input id="workNo" value={form.workNo} onChange={e => set('workNo', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>性别</Label>
              <Select value={String(form.sex)} onValueChange={v => set('sex', Number(v))} items={{ 0: '未知', 1: '男', 2: '女' }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">未知</SelectItem>
                  <SelectItem value="1">男</SelectItem>
                  <SelectItem value="2">女</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>状态</Label>
            <Select value={String(form.status)} onValueChange={v => set('status', Number(v))} items={{ 1: '正常', 2: '冻结' }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">正常</SelectItem>
                <SelectItem value="2">冻结</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pwd-expire">密码有效期</Label>
              <Input id="pwd-expire" type="date" value={form.passwordExpireAt} onChange={e => set('passwordExpireAt', e.target.value)} />
              <p className="text-muted-foreground text-xs">留空表示不限制；过期后该用户登录时强制改密</p>
            </div>
            <div className="space-y-2">
              <Label>强制改密</Label>
              <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={form.mustChangePassword === 1}
                  onChange={e => set('mustChangePassword', e.target.checked ? 1 : 0)}
                />
                下次登录必须修改密码
              </label>
            </div>
          </div>
          {loadError ? (
            <p className="text-destructive text-sm">{loadError}</p>
          ) : !roles || !depts || !posts ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>角色（多选）</Label>
                <CheckList options={roles.map(r => ({ id: r.id, label: r.roleName || r.roleCode }))} selected={form.roleIds} onToggle={id => toggle('roleIds', id)} />
              </div>
              <div className="space-y-2">
                <Label>部门（多选，首个为主部门）</Label>
                <CheckList options={depts.map(d => ({ id: d.id, label: d.departName }))} selected={form.deptIds} onToggle={id => toggle('deptIds', id)} />
              </div>
              {posts.length > 0 && (
                <div className="col-span-2 space-y-2">
                  <Label>岗位（多选）</Label>
                  <CheckList options={posts.map(p => ({ id: p.id, label: p.postName || p.postCode }))} selected={form.postIds} onToggle={id => toggle('postIds', id)} />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={submitting || !roles || !depts || !posts}>
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
