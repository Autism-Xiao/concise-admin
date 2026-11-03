import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { VisitorPoint } from '../api'

type RangeKey = '90d' | '30d' | '7d'

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '90d', label: '过去 3 个月', days: 90 },
  { key: '30d', label: '过去 30 天', days: 30 },
  { key: '7d', label: '过去 7 天', days: 7 }
]

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function VisitorsChart({ visitors }: { visitors: VisitorPoint[] }) {
  const [range, setRange] = useState<RangeKey>('90d')

  const data = useMemo(() => {
    const days = RANGES.find(r => r.key === range)?.days ?? 90
    return visitors.slice(-days)
  }, [visitors, range])

  const total = useMemo(() => data.reduce((sum, p) => sum + p.mobile + p.desktop, 0), [data])

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle>总访客数</CardTitle>
          <CardDescription>
            {RANGES.find(r => r.key === range)?.label}的总计 {total.toLocaleString()} 次访问
          </CardDescription>
        </div>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                range === r.key ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--muted-foreground)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--muted-foreground)" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.4} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                cursor={{ stroke: 'var(--border)' }}
                contentStyle={{
                  background: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: 12,
                  color: 'var(--popover-foreground)'
                }}
                labelFormatter={label => formatDate(String(label))}
                formatter={(value, name) => [Number(value).toLocaleString(), name === 'mobile' ? '移动端' : '桌面端']}
              />
              <Area type="natural" dataKey="mobile" stackId="1" stroke="var(--primary)" fill="url(#fillMobile)" strokeWidth={1.5} />
              <Area type="natural" dataKey="desktop" stackId="1" stroke="var(--muted-foreground)" fill="url(#fillDesktop)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
