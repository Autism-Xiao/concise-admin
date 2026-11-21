import { useEffect, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchExpiringTenants, type ExpiringTenant } from '../api'

/**
 * 「即将到期」租户弹窗（平台运营视图）
 *
 * 数据来自 GET /v1/tenants/expiring：未来 N 天内到期（含今天）+ 已到期未停用（daysLeft 为负），
 * 按到期日升序。与列表页的「即将到期」高亮互补：这里一次看全所有临期租户，
 * 到期提醒由每日 tenantExpireJob 给开通人发站内信，本弹窗是平台侧主动巡检入口。
 */
export function ExpiringTenantsDialog({ open, onOpenChange, days = 30 }: { open: boolean; onOpenChange: (open: boolean) => void; days?: number }) {
  const [list, setList] = useState<ExpiringTenant[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setList(null)
    setError(null)
    fetchExpiringTenants(days)
      .then(setList)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : '加载失败'))
  }, [open, days])

  const expiredCount = (list ?? []).filter(item => item.expired).length

  const daysLeftLabel = (item: ExpiringTenant): { text: string; cls: string } => {
    if (item.daysLeft < 0) return { text: `已到期 ${-item.daysLeft} 天`, cls: 'text-destructive' }
    if (item.daysLeft === 0) return { text: '今天到期', cls: 'text-destructive font-medium' }
    if (item.daysLeft <= 7) return { text: `剩 ${item.daysLeft} 天`, cls: 'text-amber-600 dark:text-amber-400 font-medium' }
    return { text: `剩 ${item.daysLeft} 天`, cls: 'text-muted-foreground' }
  }

  const planLabel = (plan: string): string => ({ trial: '试用版', standard: '标准版', enterprise: '企业版' })[plan] ?? plan

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="text-amber-600 dark:text-amber-400 size-4" />
            即将到期租户（{days} 天内）
          </DialogTitle>
          <DialogDescription>
            {list === null ? '加载中…' : `共 ${list.length} 个${expiredCount > 0 ? `，其中 ${expiredCount} 个已到期未停用` : ''}。每日任务会给开通人发到期提醒站内信；到期后用户无法进入该租户。`}
          </DialogDescription>
        </DialogHeader>

        {list === null && !error && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}

        {list !== null && list.length === 0 && <p className="text-muted-foreground py-6 text-center text-sm">窗口内没有即将到期的租户</p>}

        {list !== null && list.length > 0 && (
          <div className="max-h-[380px] overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr className="text-muted-foreground text-left text-xs">
                  <th className="px-3 py-2 font-medium">租户</th>
                  <th className="px-3 py-2 font-medium">套餐</th>
                  <th className="px-3 py-2 font-medium">到期日</th>
                  <th className="px-3 py-2 font-medium">状态</th>
                  <th className="px-3 py-2 font-medium">开通人</th>
                  <th className="px-3 py-2 text-right font-medium">用户数</th>
                </tr>
              </thead>
              <tbody>
                {list.map(item => {
                  const left = daysLeftLabel(item)
                  return (
                    <tr key={item.id} className="border-border/60 border-t">
                      <td className="px-3 py-2">
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium">{item.name}</span>
                          <code className="bg-muted text-muted-foreground w-fit rounded px-1 py-0.5 text-xs">{item.code}</code>
                        </div>
                      </td>
                      <td className="px-3 py-2">{planLabel(item.plan)}</td>
                      <td className="tabular-nums px-3 py-2">{item.expireAt}</td>
                      <td className={`px-3 py-2 ${left.cls}`}>{left.text}</td>
                      <td className="text-muted-foreground px-3 py-2">{item.ownerName || '—'}</td>
                      <td className="tabular-nums px-3 py-2 text-right">{item.userCount}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
