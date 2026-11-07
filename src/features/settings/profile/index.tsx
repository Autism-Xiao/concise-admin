import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Camera, RotateCcw } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { changeMyPassword, fetchMyProfile, setMyAvatar, updateMyProfile, type MyProfilePatch, type User } from '@/features/users/api'
import { getApiResult } from '@/lib/http'
import { getUsername, setDisplayName } from '@/lib/auth'

/** 密码规则与后端 ChangePasswordDto 保持一致：8~32 位，字母 + 数字 */
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,32}$/

/** 性别选项：值与 sys_user.sex 对齐（0 未知 / 1 男 / 2 女） */
const SEX_OPTIONS = [
  { value: '0', label: '保密' },
  { value: '1', label: '男' },
  { value: '2', label: '女' }
]

/** 页面表单：全部用字符串存，Select 的值天然是字符串，提交时再转数字 */
interface ProfileForm {
  realname: string
  email: string
  phone: string
  telephone: string
  sex: string
  birthday: string
  bio: string
}

const EMPTY_FORM: ProfileForm = { realname: '', email: '', phone: '', telephone: '', sex: '0', birthday: '', bio: '' }

/** 后端资料 → 表单（null / undefined 统一成空串，受控输入不报 warning） */
function toForm(user: User): ProfileForm {
  return {
    realname: user.realname ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    telephone: user.telephone ?? '',
    sex: String(user.sex ?? 0),
    birthday: (user.birthday ?? '').slice(0, 10),
    bio: user.bio ?? ''
  }
}

/** 只读信息行 */
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="truncate text-sm font-medium">{value || '-'}</p>
    </div>
  )
}

export function ProfilePage() {
  /** 后端拿到的完整资料（角色/部门/岗位/创建时间都从这里读，不再用本地缓存猜） */
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)

  const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '', confirm: '' })
  const [changing, setChanging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const applyProfile = useCallback((user: User) => {
    setProfile(user)
    setForm(toForm(user))
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    fetchMyProfile()
      .then(applyProfile)
      .catch(error => toast.error(error instanceof Error ? error.message : '加载个人资料失败'))
      .finally(() => setLoading(false))
  }, [applyProfile])

  useEffect(() => {
    load()
  }, [load])

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
    const body = new FormData()
    body.append('file', file)
    getApiResult<{ path: string }>('/backend-api/v1/upload', { method: 'POST', body })
      .then(({ path }) => setMyAvatar(path))
      .then(result => {
        setProfile(prev => (prev ? { ...prev, avatar: result.avatar } : prev))
        toast.success('头像已更新')
      })
      .catch(error => toast.error(error instanceof Error ? error.message : '头像上传失败'))
      .finally(() => setUploading(false))
  }

  const handleAvatarReset = () => {
    setUploading(true)
    setMyAvatar(null)
      .then(result => {
        setProfile(prev => (prev ? { ...prev, avatar: result.avatar } : prev))
        toast.success('头像已重置为系统默认')
      })
      .catch(error => toast.error(error instanceof Error ? error.message : '重置失败'))
      .finally(() => setUploading(false))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.realname.trim()) {
      toast.error('姓名不能为空')
      return
    }
    // 空串交给后端归一成 NULL（清空字段的语义）；生日留空同样清空
    const patch: MyProfilePatch = {
      realname: form.realname.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      telephone: form.telephone.trim(),
      sex: Number(form.sex),
      birthday: form.birthday,
      bio: form.bio.trim()
    }
    setSaving(true)
    updateMyProfile(patch)
      .then(next => {
        applyProfile(next)
        // 侧边栏 / 顶栏显示的是本地缓存的姓名，改完要同步
        setDisplayName(next.realname || next.username)
        toast.success('个人资料已保存')
      })
      .catch(error => toast.error(error instanceof Error ? error.message : '保存失败'))
      .finally(() => setSaving(false))
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

  /** 头像是不依赖资料的独立卡片，加载中也能先渲染骨架之外的固定部分 */
  const avatarNode = profile?.avatar ? (
    <Avatar className="size-16">
      <AvatarImage src={profile.avatar} alt="头像" />
      <AvatarFallback className="text-lg">{(profile.realname || profile.username).slice(0, 2)}</AvatarFallback>
    </Avatar>
  ) : (
    <Avatar className="size-16">
      <AvatarFallback className="text-lg">{((loading ? '' : profile?.realname) || getUsername()).slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  )

  return (
    <div className="w-full max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>头像</CardTitle>
          <CardDescription>支持 PNG / JPEG / GIF / WEBP / BMP，不超过 5MB；文件内容会按图片头校验</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          {avatarNode}
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <Camera />
              {uploading ? '处理中…' : '更换头像'}
            </Button>
            <Button type="button" variant="ghost" disabled={uploading || !profile?.avatar} onClick={handleAvatarReset}>
              <RotateCcw />
              恢复默认
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,image/bmp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>个人资料</CardTitle>
          <CardDescription>姓名、联系方式与简介可自助修改；账号、工号、角色、部门由管理员维护</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted/40 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border p-3 sm:grid-cols-3">
              <InfoItem label="登录账号" value={profile?.username ?? ''} />
              <InfoItem label="工号" value={profile?.workNo ?? ''} />
              <InfoItem label="状态" value={profile?.status === 2 ? '冻结' : '正常'} />
              <InfoItem label="角色" value={(profile?.roles ?? []).map(role => role.roleName ?? role.roleCode).join(' / ')} />
              <InfoItem label="部门" value={(profile?.depts ?? []).map(dept => dept.departName).join(' / ')} />
              <InfoItem label="岗位" value={(profile?.posts ?? []).map(post => post.postName ?? post.postCode ?? '').join(' / ')} />
            </div>
          )}

          <Separator />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-name">姓名</Label>
                <Input
                  id="profile-name"
                  value={form.realname}
                  maxLength={100}
                  disabled={loading}
                  placeholder="请输入真实姓名"
                  onChange={e => setForm({ ...form, realname: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">邮箱</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={form.email}
                  maxLength={45}
                  disabled={loading}
                  placeholder="用于接收通知，留空表示不设置"
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-phone">手机号</Label>
                <Input
                  id="profile-phone"
                  value={form.phone}
                  maxLength={45}
                  disabled={loading}
                  placeholder="请输入手机号"
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-telephone">座机号</Label>
                <Input
                  id="profile-telephone"
                  value={form.telephone}
                  maxLength={45}
                  disabled={loading}
                  placeholder="如 010-88886666"
                  onChange={e => setForm({ ...form, telephone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-sex">性别</Label>
                <Select value={form.sex} onValueChange={value => setForm({ ...form, sex: value })} items={SEX_OPTIONS} disabled={loading}>
                  <SelectTrigger id="profile-sex" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEX_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-birthday">生日</Label>
                <Input
                  id="profile-birthday"
                  type="date"
                  value={form.birthday}
                  disabled={loading}
                  onChange={e => setForm({ ...form, birthday: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-bio">个人简介</Label>
              <Textarea
                id="profile-bio"
                rows={3}
                maxLength={255}
                value={form.bio}
                disabled={loading}
                placeholder="介绍一下自己（最多 255 字）"
                onChange={e => setForm({ ...form, bio: e.target.value })}
              />
              <p className="text-muted-foreground text-xs">已输入 {form.bio.length} / 255</p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving || loading}>
                {saving ? '保存中…' : '保存'}
              </Button>
              <Button type="button" variant="ghost" disabled={saving || loading || !profile} onClick={() => profile && setForm(toForm(profile))}>
                <RotateCcw />
                还原
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>修改密码</CardTitle>
          <CardDescription>修改成功后其他设备会全部下线（当前浏览器保持登录）。当前账号：{profile?.username || getUsername() || '-'}</CardDescription>
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
