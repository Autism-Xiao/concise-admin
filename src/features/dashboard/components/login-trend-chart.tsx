import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { LoginTrendBlock } from '../api'

/** 图表 x 轴：2026-11-07 → 11-07 */
function shortDate(iso: string): string {
  const [, month, day] = iso.split('-')
  return `${Number(month)}-${day}`
}

/** 2026-11-07 → 11月7日（tooltip 用完整一些的写法） */
function longDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${year}年${Number(month)}月${Number(day)}日`
}

/**
 * 登录趋势（近 7 天）
 *
 * 特意把「失败」也画出来：库里失败次数经常比成功还多（脚本/重复登录），
 * 只看成功数会把异常完全吃掉。两条线都不堆叠，便于看出失败占比。
 */
export function LoginTrendChart({ block }: { block: LoginTrendBlock }) {
  const totalSuccess = block.points.reduce((sum, point) => sum + point.success, 0)
  const totalFail = block.points.reduce((sum, point) => sum + point.fail, 0)
  const isEmpty = totalSuccess === 0 && totalFail === 0

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            登录趋势
            <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs font-normal">
              {block.scope === 'all' ? '全站' : '仅我的'}
            </span>
          </CardTitle>
          <CardDescription>
            近 7 天成功 {totalSuccess.toLocaleString()} 次
            {totalFail > 0 && <span className="text-destructive"> · 失败 {totalFail.toLocaleString()} 次</span>}
          </CardDescription>
        </div>
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1">
            <i className="bg-primary size-2 rounded-full" />
            成功
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="bg-destructive size-2 rounded-full" />
            失败
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="text-muted-foreground flex h-56 items-center justify-center text-sm">近 7 天没有登录记录</div>
        ) : (
          <div
            // overflow-hidden + min-w-0：容器变窄时（手机竖屏 / 侧边栏收起），
            // recharts 还没来得及按新宽度重画 SVG，min-content 会把外层 grid 轨道撑爆；
            // 先裁住溢出，ResponsiveContainer 的 ResizeObserver 随即按真实宽度重画
            className="h-48 w-full min-w-0 overflow-hidden sm:h-56"
          >
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <AreaChart data={block.points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="fillSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fillFail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--destructive)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--destructive)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.4} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                />
                <YAxis hide domain={[0, 'auto']} allowDecimals={false} />
                <Tooltip
                  cursor={{ stroke: 'var(--border)' }}
                  contentStyle={{
                    background: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: 12,
                    color: 'var(--popover-foreground)'
                  }}
                  labelFormatter={label => longDate(String(label))}
                  formatter={(value, name) => [Number(value).toLocaleString(), name === 'success' ? '成功' : '失败']}
                />
                <Area
                  type="monotone"
                  dataKey="success"
                  stroke="var(--primary)"
                  fill="url(#fillSuccess)"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="fail"
                  stroke="var(--destructive)"
                  fill="url(#fillFail)"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={{ r: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
