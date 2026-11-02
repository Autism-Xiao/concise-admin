import { useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserFormDialog } from './components/user-form-dialog'
import { users as mockUsers, type User, type UserStatus } from './data/users'

const statusMap: Record<UserStatus, { label: string; className: string }> = {
  active: { label: '活跃', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  inactive: { label: '未激活', className: 'bg-muted text-muted-foreground' },
  invited: { label: '已邀请', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  suspended: { label: '已停用', className: 'bg-destructive/15 text-destructive' }
}

export function UsersPage() {
  const [list, setList] = useState<User[]>(mockUsers)
  const [keyword, setKeyword] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return list
    return list.filter(u => u.name.toLowerCase().includes(q) || u.username.includes(q) || u.email.includes(q))
  }, [list, keyword])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (user: User) => {
    setEditing(user)
    setFormOpen(true)
  }

  const handleSubmit = (values: Omit<User, 'id' | 'createdAt'>) => {
    if (editing) {
      setList(prev => prev.map(u => (u.id === editing.id ? { ...u, ...values } : u)))
      toast.success('用户已更新')
    } else {
      setList(prev => [{ ...values, id: Math.max(...prev.map(u => u.id)) + 1, createdAt: new Date().toISOString().slice(0, 10) }, ...prev])
      toast.success('用户已创建')
    }
    setFormOpen(false)
  }

  const handleDelete = () => {
    if (!deleting) return
    setList(prev => prev.filter(u => u.id !== deleting.id))
    toast.success(`已删除用户「${deleting.name}」`)
    setDeleting(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-muted-foreground text-sm">共 {list.length} 个用户（mock 数据）</p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          新增用户
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="relative max-w-xs">
            <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
            <Input placeholder="搜索姓名 / 用户名 / 邮箱" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>用户名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-end">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground h-24 text-center">
                    没有匹配的用户
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(user => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusMap[user.status].className}`}>{statusMap[user.status].label}</span>
                  </TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{user.createdAt}</TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                      <Pencil className="size-4" />
                      <span className="sr-only">编辑</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(user)}>
                      <Trash2 className="text-destructive size-4" />
                      <span className="sr-only">删除</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {formOpen && <UserFormDialog key={editing?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} user={editing} onSubmit={handleSubmit} />}

      <Dialog open={!!deleting} onOpenChange={v => !v && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              即将删除用户「{deleting?.name}」，该操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
