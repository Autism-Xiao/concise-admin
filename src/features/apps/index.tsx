import { apps } from './data/apps'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function AppsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">应用</h1>
        <p className="text-muted-foreground text-sm">第三方应用集成（mock 数据）</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {apps.map(app => (
          <Card key={app.name}>
            <CardHeader>
              <CardTitle>{app.name}</CardTitle>
              <CardDescription>{app.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant={app.connected ? 'outline' : 'default'} size="sm" className="w-full">
                {app.connected ? '已连接' : '连接'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
