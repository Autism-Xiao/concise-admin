import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const stats = [
  { title: '总收入', value: '¥45,231', change: '+20.1% 较上月' },
  { title: '订阅数', value: '+2,350', change: '+180.1% 较上月' },
  { title: '销售额', value: '+12,234', change: '+19% 较上月' },
  { title: '活跃用户', value: '+573', change: '+201 较昨日' }
]

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">仪表盘</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-muted-foreground mt-1 text-xs">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
