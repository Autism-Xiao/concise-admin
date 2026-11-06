import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Camera, RotateCcw } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { changeMyPassword, setMyAvatar } from '@/features/users/api'
import { getApiResult } from '@/lib/http'
import { getName, getUsername } from '@/lib/auth'

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
  /** 头像相对路径（上传接口返回）；null = 系统默认 */
  const [avatar, setAvatar] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  /** 选图后立即上传：经 /v1/upload（位图校验）拿到相对路径，再落到 sys_user.avatar */
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 允许连续选择同一张图
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('头像图片不能超过 5MB')
      return
    }
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    getApiResult<{ path: string }>('/backend-api/upload', { method: 'POST', body: form })
      .then(({ path }) => setMyAvatar(path))
      .then(result => {
        setAvatar(result.avatar)
        toast.success('头像已更新')
      })
      .catch(error => toast.error(error instanceof Error ? error.message : '头像上传失败'))
      .finally(() => setUploading(false))
  }

  const handleAvatarReset = () => {
    setUploading(true)
    setMyAvatar(null)
      .then(result => {
        setAvatar(result.avatar)
        toast.success('头像已重置为系统默认')
      })
      .catch(error => toast.error(error instanceof Error ? error.message : '重置失败'))
      .finally(() => setUploading(false))
  }

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
          <CardTitle>头像</CardTitle>
          <CardDescription>支持 PNG / JPEG / GIF / WEBP / BMP，不超过 5MB；文件内容会按图片头校验</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          {avatar ? (
            <img src={avatar} alt="头像" className="size-16 rounded-full border object-cover" />
          ) : (
            <Avatar className="size-16">
              <AvatarFallback className="text-lg">{(getName() || getUsername()).slice(0, 2)}</AvatarFallback>
            </Avatar>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <Camera />
              {uploading ? '处理中…' : '更换头像'}
            </Button>
            <Button type="button" variant="ghost" disabled={uploading || !avatar} onClick={handleAvatarReset}>
              <RotateCcw />
              恢复默认
            </Button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/bmp" className="hidden" onChange={handleAvatarChange} />
          </div>
        </CardContent>
      </Card>

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
