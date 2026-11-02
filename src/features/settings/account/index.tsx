import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function AccountPage() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [twoFactor, setTwoFactor] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.current || !form.next) {
      toast.error('请填写完整的密码信息')
      return
    }
    if (form.next !== form.confirm) {
      toast.error('两次输入的新密码不一致')
      return
    }
    toast.success('密码已更新（mock）')
    setForm({ current: '', next: '', confirm: '' })
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
              <Input id="pwd-current" type="password" value={form.current} onChange={e => setForm({ ...form, current: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwd-next">新密码</Label>
              <Input id="pwd-next" type="password" value={form.next} onChange={e => setForm({ ...form, next: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwd-confirm">确认新密码</Label>
              <Input id="pwd-confirm" type="password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} />
            </div>
            <Button type="submit">更新密码</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>两步验证</CardTitle>
          <CardDescription>登录时额外要求验证码（mock）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm">启用两步验证</span>
            <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
