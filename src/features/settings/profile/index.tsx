import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ProfilePage() {
  const [form, setForm] = useState({
    name: '张三',
    username: 'zhangsan',
    email: 'zhangsan@example.com',
    bio: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success('个人资料已保存')
  }

  return (
    <Card className="w-full max-w-2xl">
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
  )
}
