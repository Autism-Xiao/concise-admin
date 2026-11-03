import { useEffect, useState } from 'react'
import { Cpu, HardDrive, MemoryStick, RefreshCw, Server } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchServerInfo, type ServerInfo } from './api'

/** 使用率进度条：>85% 红色，>60% 橙色，其余主色 */
function UsageBar({ usage }: { usage: number }) {
  const color = usage > 85 ? 'bg-red-500' : usage > 60 ? 'bg-amber-500' : 'bg-primary'
  return (
    <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(usage, 100)}%` }} />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="truncate text-right font-medium">{value}</span>
    </div>
  )
}

export function ServerMonitorPage() {
  const [info, setInfo] = useState<ServerInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchServerInfo()
      .then(setInfo)
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">服务监控</h1>
          <p className="text-muted-foreground text-sm">服务器与运行时状态（mock 数据）</p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw />
          刷新
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error || !info ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <p className="text-muted-foreground text-sm">{error ?? '加载失败'}</p>
            <Button variant="outline" onClick={load}>
              重试
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Server className="size-4" />
                服务器信息
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <InfoRow label="主机名" value={info.host.hostname} />
              <InfoRow label="操作系统" value={`${info.host.os} (${info.host.arch})`} />
              <InfoRow label="内网 IP" value={info.host.ip} />
              <InfoRow label="已运行" value={info.host.uptime} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Cpu className="size-4" />
                CPU
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="型号" value={info.cpu.model} />
              <InfoRow label="核心数" value={`${info.cpu.cores} 核`} />
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">使用率</span>
                  <span className="font-medium tabular-nums">{info.cpu.usage}%</span>
                </div>
                <UsageBar usage={info.cpu.usage} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MemoryStick className="size-4" />
                内存
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="总内存" value={`${(info.memory.total / 1024).toFixed(0)} GB`} />
              <InfoRow label="已使用" value={`${(info.memory.used / 1024).toFixed(1)} GB`} />
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">使用率</span>
                  <span className="font-medium tabular-nums">{info.memory.usage}%</span>
                </div>
                <UsageBar usage={info.memory.usage} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HardDrive className="size-4" />
                磁盘与运行时
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {info.disks.map(d => (
                <div key={d.name} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{d.name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {d.used} / {d.total} GB（{d.usage}%）
                    </span>
                  </div>
                  <UsageBar usage={d.usage} />
                </div>
              ))}
              <div className="divide-y border-t pt-2">
                <InfoRow label="Node.js" value={info.node.version} />
                <InfoRow label="进程内存" value={`${info.node.memoryUsage} MB`} />
                <InfoRow label="进程已运行" value={info.node.uptime} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
