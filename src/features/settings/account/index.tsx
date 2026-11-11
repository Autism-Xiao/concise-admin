import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changeMyPassword } from '@/features/users/api'
import { TwoFactorCard } from './two-factor-card'

export function AccountPage() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.current || !form.next) {
      toast.error('请填写完整的密码信息')
      return
    }
    if (form.next !== form.confirm) {
      toast.error('两次输入的新密码不一致')
      return
    }
    // 与后端 ChangePasswordDto 的校验保持一致，提前拦截省一次请求
    if (form.next === form.current) {
      toast.error('新密码不能与当前密码相同')
      return
    }
    if (form.next.length < 8 || form.next.length > 32 || !/[A-Za-z]/.test(form.next) || !/\d/.test(form.next)) {
      toast.error('新密码需 8~32 位，且同时包含字母和数字')
      return
    }
    setSubmitting(true)
    try {
      await changeMyPassword(form.current, form.next)
      // 后端会踢掉其他端登录态（保留当前会话），提示用户免得以为掉线是 bug
      toast.success('密码已更新，其他设备已自动退出登录')
      setForm({ current: '', next: '', confirm: '' })
    } catch (error) {
      // 后端 message 是人话（原密码不正确 / 新密码需 8~32 位等），直接展示
      toast.error(error instanceof Error ? error.message : '修改密码失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>修改密码</CardTitle>
          <CardDescription>定期更换密码可以提高账户安全性</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pwd-current">当前密码</Label>
              <Input id="pwd-current" type="password" autoComplete="current-password" value={form.current} onChange={e => setForm({ ...form, current: e.target.value })} />
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="pwd-next">新密码</Label>
                <span className="text-muted-foreground text-xs">8~32 位，需同时包含字母和数字</span>
              </div>
              <Input id="pwd-next" type="password" autoComplete="new-password" value={form.next} onChange={e => setForm({ ...form, next: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwd-confirm">确认新密码</Label>
              <Input id="pwd-confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} />
            </div>
            <Button type="submit" disabled={submitting}>{submitting ? '更新中…' : '更新密码'}</Button>
          </form>
        </CardContent>
      </Card>

      <TwoFactorCard />
    </div>
  )
}
