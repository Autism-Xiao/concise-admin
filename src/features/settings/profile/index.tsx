import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { changeMyPassword } from '@/features/users/api'
import { getUsername } from '@/lib/auth'

/** 密码规则与后端 ChangePasswordDto 保持一致：8~32 位，字母 + 数字 */
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,32}$/

export function ProfilePage() {
  const [form, setForm] = useState({
    name: '张三',
    username: 'zhangsan',
    email: 'zhangsan@example.com',
    bio: ''
  })

  const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '', confirm: '' })
  const [changing, setChanging] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success('个人资料已保存')
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!PASSWORD_PATTERN.test(pwd.newPassword)) {
      toast.error('新密码需 8~32 位，且同时包含字母和数字')
      return
    }
    if (pwd.newPassword !== pwd.confirm) {
      toast.error('两次输入的新密码不一致')
      return
    }
    setChanging(true)
    changeMyPassword(pwd.oldPassword, pwd.newPassword)
      .then(() => {
        toast.success('密码已修改，其他设备的登录已全部下线')
        setPwd({ oldPassword: '', newPassword: '', confirm: '' })
      })
      .catch(error => toast.error(error instanceof Error ? error.message : '修改失败'))
      .finally(() => setChanging(false))
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>个人资料</CardTitle>
          <CardDescription>这是其他用户看到的公开信息</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">姓名</Label>
              <Input id="profile-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-username">用户名</Label>
              <Input id="profile-username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">邮箱</Label>
              <Input id="profile-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-bio">个人简介</Label>
              <Input id="profile-bio" placeholder="介绍一下自己" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
            </div>
            <Button type="submit">保存</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>修改密码</CardTitle>
          <CardDescription>修改成功后其他设备会全部下线（当前浏览器保持登录）。当前账号：{getUsername() || '-'}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pwd-old">原密码</Label>
              <Input
                id="pwd-old"
                type="password"
                autoComplete="current-password"
                required
                value={pwd.oldPassword}
                onChange={e => setPwd({ ...pwd, oldPassword: e.target.value })}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="pwd-new">新密码</Label>
              <Input
                id="pwd-new"
                type="password"
                autoComplete="new-password"
                required
                placeholder="8~32 位，字母 + 数字"
                value={pwd.newPassword}
                onChange={e => setPwd({ ...pwd, newPassword: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwd-confirm">确认新密码</Label>
              <Input
                id="pwd-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={pwd.confirm}
                onChange={e => setPwd({ ...pwd, confirm: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={changing || !pwd.oldPassword || !pwd.newPassword || !pwd.confirm}>
              {changing ? '提交中…' : '修改密码'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
