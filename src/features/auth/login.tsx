import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function LoginPage() {
  const navigate = useNavigate()

  return (
    <div className="bg-muted flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>登录</CardTitle>
          <CardDescription>登录到你的 {import.meta.env.VITE_APP_NAME} 账户</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={e => {
              e.preventDefault()
              void navigate({ to: '/dashboard' })
            }}
          >
            <Input type="email" placeholder="邮箱" required />
            <Input type="password" placeholder="密码" required />
            <Button type="submit" className="w-full">
              登录
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
