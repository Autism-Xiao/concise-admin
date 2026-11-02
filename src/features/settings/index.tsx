import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">系统设置</h1>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>外观</CardTitle>
          <CardDescription>切换浅色 / 深色 / 跟随系统主题</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>
    </div>
  )
}
