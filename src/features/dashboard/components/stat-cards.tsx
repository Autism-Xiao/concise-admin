import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardStat } from '../api'

export function StatCards({ stats }: { stats: DashboardStat[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(stat => {
        const up = stat.trend === 'up'
        const TrendIcon = up ? TrendingUp : TrendingDown
        return (
          <Card key={stat.key}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-muted-foreground text-sm font-medium">{stat.title}</CardTitle>
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium ${
                    up ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'border-destructive/30 text-destructive'
                  }`}
                >
                  <TrendIcon className="size-3" />
                  {stat.change}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
              <p className="mt-1 flex items-center gap-1 text-xs font-medium">
                {stat.hint}
                <TrendIcon className={`size-3 ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`} />
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">{stat.footnote}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
