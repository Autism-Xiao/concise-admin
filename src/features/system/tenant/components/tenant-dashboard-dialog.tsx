import { useEffect, useState } from 'react'
import { BarChart3, Building2, CalendarClock, Activity, Gauge, TrendingUp, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchTenantDashboard, type TenantDashboard } from '../api'

/**
 * 租户运营仪表盘弹窗（平台侧）
 *
 * 数据来自 GET /v1/tenants/dashboard 单次聚合：
 * 概览计数 / 套餐分布 / 注册趋势（近 6 月）/ API 调用量 Top（当月 metering）/ 配额水位。
 * API 用量与配额口径的说明直接写在对应区块，避免「数字对不上」的疑问。
 */
export function TenantDashboardDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [data, setData] = useState<TenantDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setData(null)
    setError(null)
    fetchTenantDashboard()
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : '加载失败'))
  }, [open])

  const planLabel = (plan: string): string => ({ trial: '试用版', standard: '标准版', enterprise: '企业版' })[plan] ?? plan
  const maxPlanCount = Math.max(1, ...(data?.planDistribution ?? []).map(item => item.count))
  const maxTrendCount = Math.max(1, ...(data?.registerTrend ?? []).map(item => item.count))
  const maxCalls = Math.max(1, ...(data?.apiCallsTop ?? []).map(item => item.calls))

  /** 水位百分比：限额 0（不限制）返回 null，进度条按「无上限」样式渲染 */
  const waterPct = (used: number, limit: number): number | null => (limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : null)
  const waterCls = (pct: number): string => (pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-amber-500' : 'bg-primary')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="text-primary size-4" />
            租户运营仪表盘
          </DialogTitle>
          <DialogDescription>平台侧聚合视图：概览、套餐分布、注册趋势、当月 API 用量与配额水位。</DialogDescription>
        </DialogHeader>

        {error && <p className="text-destructive text-sm">{error}</p>}

        {!data && !error && (
          <div className="space-y-3">
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(8rem, 1fr))' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {data && (
          <div className="space-y-5">
            {/* 概览计数 */}
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(8rem, 1fr))' }}>
              {[
                { label: '租户总数', value: data.overview.total, icon: Building2, cls: '' },
                { label: '正常', value: data.overview.active, icon: TrendingUp, cls: '' },
                { label: '已停用', value: data.overview.disabled, icon: Users, cls: 'text-muted-foreground' },
                {
                  label: '已到期未停用',
                  value: data.overview.expiredActive,
                  icon: CalendarClock,
                  cls: data.overview.expiredActive > 0 ? 'text-destructive' : 'text-muted-foreground'
                },
                {
                  label: '30 天内到期',
                  value: data.overview.expiringIn30,
                  icon: Activity,
                  cls: data.overview.expiringIn30 > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                }
              ].map(item => (
                <div key={item.label} className="bg-muted/40 rounded-lg border px-3 py-2.5">
                  <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <item.icon className="size-3.5" />
                    {item.label}
                  </div>
                  <div className={`mt-1 text-xl font-semibold tabular-nums ${item.cls}`}>{item.value.toLocaleString()}</div>
                </div>
              ))}
            </div>

            {/* 套餐分布 + 注册趋势 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <h4 className="text-muted-foreground mb-2.5 text-xs font-medium">套餐分布</h4>
                {data.planDistribution.length === 0 ? (
                  <p className="text-muted-foreground py-3 text-center text-sm">暂无数据</p>
                ) : (
                  <div className="space-y-2">
                    {data.planDistribution.map(item => (
                      <div key={item.plan} className="flex items-center gap-2 text-sm">
                        <span className="w-14 shrink-0">{planLabel(item.plan)}</span>
                        <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                          <div className="bg-primary h-full rounded-full" style={{ width: `${(item.count / maxPlanCount) * 100}%` }} />
                        </div>
                        <span className="tabular-nums w-8 text-right">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-lg border p-3">
                <h4 className="text-muted-foreground mb-2.5 text-xs font-medium">注册趋势（近 6 月）</h4>
                {data.registerTrend.length === 0 ? (
                  <p className="text-muted-foreground py-3 text-center text-sm">暂无数据</p>
                ) : (
                  <div className="space-y-2">
                    {data.registerTrend.map(item => (
                      <div key={item.month} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground w-16 shrink-0 text-xs">{item.month.slice(5)}月</span>
                        <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                          <div className="bg-primary h-full rounded-full" style={{ width: `${(item.count / maxTrendCount) * 100}%` }} />
                        </div>
                        <span className="tabular-nums w-8 text-right">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* API 调用量 Top */}
            <div className="rounded-lg border p-3">
              <h4 className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs font-medium">
                <Activity className="size-3.5" />
                当月 API 调用量 Top 10
              </h4>
              <p className="text-muted-foreground/70 mb-2.5 text-[11px]">计量攒批落库有 ≤30 秒延迟，数字为近似值。</p>
              {data.apiCallsTop.length === 0 ? (
                <p className="text-muted-foreground py-3 text-center text-sm">当月暂无租户调用量数据</p>
              ) : (
                <div className="space-y-2">
                  {data.apiCallsTop.map(item => (
                    <div key={item.tenantId} className="flex items-center gap-2 text-sm">
                      <span className="w-32 shrink-0 truncate" title={item.name}>
                        {item.name}
                      </span>
                      <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${(item.calls / maxCalls) * 100}%` }} />
                      </div>
                      <span className="tabular-nums w-20 text-right">{item.calls.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 配额水位 */}
            <div className="rounded-lg border p-3">
              <h4 className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs font-medium">
                <Gauge className="size-3.5" />
                配额水位（活跃租户）
              </h4>
              <p className="text-muted-foreground/70 mb-2.5 text-[11px]">上限取自租户配额配置；0 = 不限制。≥70% 黄色、≥90% 红色。</p>
              {data.quotaWater.length === 0 ? (
                <p className="text-muted-foreground py-3 text-center text-sm">暂无配额数据</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="text-muted-foreground text-left text-xs">
                        <th className="pb-1.5 font-medium">租户</th>
                        <th className="pb-1.5 font-medium">用户数</th>
                        <th className="pb-1.5 font-medium">存储</th>
                        <th className="pb-1.5 font-medium">水位</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.quotaWater.map(item => {
                        const userPct = waterPct(item.users, item.maxUsers)
                        const storagePct = waterPct(item.storageMb, item.maxStorageMb)
                        const worst = Math.max(userPct ?? 0, storagePct ?? 0)
                        return (
                          <tr key={item.tenantId} className="border-border/60 border-t">
                            <td className="max-w-40 truncate py-2" title={item.name}>
                              {item.name}
                            </td>
                            <td className="tabular-nums py-2 text-xs">
                              {item.users}
                              {item.maxUsers > 0 ? ` / ${item.maxUsers}` : ''}
                            </td>
                            <td className="tabular-nums py-2 text-xs">
                              {item.storageMb.toFixed(1)} MB
                              {item.maxStorageMb > 0 ? ` / ${item.maxStorageMb} MB` : ''}
                            </td>
                            <td className="py-2">
                              {worst === 0 ? (
                                <span className="text-muted-foreground text-xs">—</span>
                              ) : (
                                <div className="bg-muted h-1.5 w-full max-w-28 overflow-hidden rounded-full">
                                  <div className={`h-full rounded-full ${waterCls(worst)}`} style={{ width: `${worst}%` }} />
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
