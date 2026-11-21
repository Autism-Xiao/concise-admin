import { useEffect, useState } from 'react'
import { Activity, Gauge, History } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchQuotaChanges, fetchTenantUsage, type QuotaChangeItem, type TenantUsage } from '../api'

/** 用量键 → 展示名/单位（后端新增指标时这里缺省按原样展示数字） */
const METRIC_LABEL: Record<string, { label: string; format?: (v: number) => string }> = {
  'api.calls': { label: 'API 调用次数' },
  'api.errors': { label: 'API 失败次数' },
  'file.upload.bytes': { label: '上传流量', format: v => (v / 1024 / 1024).toFixed(2) + ' MB' }
}

/**
 * 租户用量弹窗（租户侧自助视图）
 *
 * 平台侧的运营仪表盘在租户管理页；这里是租户管理员自己看「本月用量 + 配额/开关变更记录」，
 * 数据来自 /v1/metering/usage（攒批 ≤30s 延迟）与 /v1/metering/quota-changes（字段级变更审计）。
 */
export function TenantUsageDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [usage, setUsage] = useState<TenantUsage | null>(null)
  const [changes, setChanges] = useState<QuotaChangeItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setUsage(null)
    setChanges(null)
    setError(null)
    fetchTenantUsage()
      .then(setUsage)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : '加载失败'))
    fetchQuotaChanges({ pageSize: 10 })
      .then(res => setChanges((res.records ?? []) as QuotaChangeItem[]))
      .catch(() => setChanges([]))
  }, [open])

  const metricEntries = Object.entries(usage?.metrics ?? {})
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="text-primary size-4" />
            租户用量
          </DialogTitle>
          <DialogDescription>
            {usage ? `账期 ${usage.period}；用量为近似值（计量攒批落库有 ≤30 秒延迟）。配额上限由管理员在参数配置里调整，调整记录见下方。` : '加载中…'}
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-destructive text-sm">{error}</p>}

        {/* 月度用量 */}
        {!usage && !error && (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}
        {usage && (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))' }}>
            {metricEntries.length === 0 ? (
              <p className="text-muted-foreground py-2 text-sm">本月暂无用量记录</p>
            ) : (
              metricEntries.map(([key, value]) => {
                const meta = METRIC_LABEL[key]
                return (
                  <div key={key} className="bg-muted/40 rounded-lg border px-3 py-2.5">
                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <Activity className="size-3.5" />
                      {meta?.label ?? key}
                    </div>
                    <div className="mt-1 text-lg font-semibold tabular-nums">{meta?.format ? meta.format(value) : value.toLocaleString()}</div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* 配额/开关变更记录 */}
        <div className="space-y-2">
          <h4 className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
            <History className="size-3.5" />
            配置变更记录（最近 10 条）
          </h4>
          {changes === null ? (
            <Skeleton className="h-20 w-full" />
          ) : changes.length === 0 ? (
            <p className="text-muted-foreground text-sm">暂无变更记录</p>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-muted-foreground text-left text-xs">
                    <th className="px-3 py-2 font-medium">参数</th>
                    <th className="px-3 py-2 font-medium">变更</th>
                    <th className="px-3 py-2 font-medium">操作人</th>
                    <th className="px-3 py-2 font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map(item => (
                    <tr key={item.id} className="border-border/60 border-t">
                      <td className="px-3 py-2">
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium">{item.configName ?? item.configKey ?? '—'}</span>
                          {item.configKey && <code className="bg-muted text-muted-foreground w-fit rounded px-1 py-0.5 text-xs">{item.configKey}</code>}
                        </div>
                      </td>
                      <td className="tabular-nums px-3 py-2 text-xs">
                        <span className="text-muted-foreground">{item.oldValue || '∅'}</span>
                        <span className="mx-1">→</span>
                        <span className="font-medium">{item.newValue || '∅'}</span>
                      </td>
                      <td className="text-muted-foreground px-3 py-2">{item.operateUserName || '—'}</td>
                      <td className="text-muted-foreground px-3 py-2 text-xs">{item.createTime?.slice(0, 19).replace('T', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
