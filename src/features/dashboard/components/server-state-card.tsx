import { ChevronRight, Server } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatBytes, type ServerStateBlock } from '../api'

interface ServerStateCardProps {
  block: ServerStateBlock
  onOpenMonitor: () => void
}

/** 使用率配色：<70 正常 / 70~85 偏高 / >=85 告警 */
function toneOf(usage: number): { bar: string; text: string } {
  if (usage >= 85) return { bar: 'bg-destructive', text: 'text-destructive' }
  if (usage >= 70) return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' }
  return { bar: 'bg-primary', text: 'text-foreground' }
}

function UsageRow({ label, usage, extra }: { label: string; usage: number; extra?: string }) {
  const tone = toneOf(usage)
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-medium tabular-nums', tone.text)}>
          {usage.toFixed(1)}%
          {extra && <span className="text-muted-foreground ms-1 text-xs font-normal">{extra}</span>}
        </span>
      </div>
      <div className="bg-muted mt-1 h-1.5 w-full overflow-hidden rounded-full">
        <div className={cn('h-full rounded-full transition-[width] duration-500', tone.bar)} style={{ width: `${Math.min(usage, 100)}%` }} />
      </div>
    </div>
  )
}

/**
 * 系统状态
 *
 * 数据来自 /v1/dashboard/overview 内嵌的 os 实时采集（CPU 采样 200ms，
 * 服务端与其它查询并行，不会叠加到首屏）。仅 system:monitor:server 可见。
 */
export function ServerStateCard({ block, onOpenMonitor }: ServerStateCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Server className="text-muted-foreground size-4" />
          系统状态
        </CardTitle>
        <CardAction>
          <Button variant="link" size="sm" className="h-auto px-0" onClick={onOpenMonitor}>
            服务监控
            <ChevronRight />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <UsageRow label="CPU" usage={block.cpuUsage} />
        <UsageRow
          label="内存"
          usage={block.memoryUsage}
          extra={`${formatBytes(block.memoryUsedMb * 1024 * 1024)} / ${formatBytes(block.memoryTotalMb * 1024 * 1024)}`}
        />
        <UsageRow label="系统盘" usage={block.diskUsage} />
        <div className="text-muted-foreground border-t pt-2 text-xs">
          Node {block.nodeVersion} · 已运行 {block.uptime}
        </div>
      </CardContent>
    </Card>
  )
}
