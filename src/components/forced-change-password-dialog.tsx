import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changeMyPassword } from '@/features/users/api'
import { getUsername } from '@/lib/auth'

/** 密码规则与后端 ChangePasswordDto 保持一致：8~32 位，字母 + 数字 */
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,32}$/

/**
 * 强制改密拦截弹窗：密码过期 / 管理员标记「下次登录强制改密」时，
 * 登录后先弹此框（不可关闭、不可点遮罩逃逸），改完密码才放行进入系统。
 */
export function ForceChangePasswordDialog() {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirm: '' })
  const [changing, setChanging] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!PASSWORD_PATTERN.test(form.newPassword)) {
      toast.error('新密码需 8~32 位，且同时包含字母和数字')
      return
    }
    if (form.newPassword !== form.confirm) {
      toast.error('两次输入的新密码不一致')
      return
    }
    setChanging(true)
    changeMyPassword(form.oldPassword, form.newPassword)
      .then(() => {
        toast.success('密码已修改，欢迎回来')
        setDone(true)
      })
      .catch(error => toast.error(error instanceof Error ? error.message : '修改失败'))
      .finally(() => setChanging(false))
  }

  return (
    <Dialog open={!done} onOpenChange={() => undefined}>
      {/* open 固定 true 且忽略 onOpenChange：点遮罩/ESC 都关不掉，改完密码才消失 */}
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>请先修改密码</DialogTitle>
          <DialogDescription>
            当前账号（{getUsername()}）的密码已过期或被管理员要求重置，为保障账号安全，请先设置新密码再继续使用。
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="force-pwd-old">当前密码</Label>
            <Input
              id="force-pwd-old"
              type="password"
              autoComplete="current-password"
              required
              value={form.oldPassword}
              onChange={e => setForm({ ...form, oldPassword: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="force-pwd-new">新密码</Label>
            <Input
              id="force-pwd-new"
              type="password"
              autoComplete="new-password"
              required
              placeholder="8~32 位，字母 + 数字；不能与当前密码相同"
              value={form.newPassword}
              onChange={e => setForm({ ...form, newPassword: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="force-pwd-confirm">确认新密码</Label>
            <Input
              id="force-pwd-confirm"
              type="password"
              autoComplete="new-password"
              required
              value={form.confirm}
              onChange={e => setForm({ ...form, confirm: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full" disabled={changing || !form.oldPassword || !form.newPassword || !form.confirm}>
            {changing ? '提交中…' : '修改密码并继续'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
