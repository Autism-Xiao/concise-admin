import { useEffect, useMemo, useState } from 'react'
import { Database, Gauge, HardDrive, KeyRound, RefreshCw } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable, DataTableColumnHeader, DataTablePagination, useDataTable } from '@/components/data-table'
import { fetchCacheInfo, type CacheInfo, type CacheKeyStat } from './api'

export function CacheMonitorPage() {
  const [info, setInfo] = useState<CacheInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchCacheInfo()
      .then(setInfo)
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const keys = useMemo(() => info?.keys ?? [], [info])

  const columns = useMemo<ColumnDef<CacheKeyStat>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="缓存名称" />,
        cell: ({ row }) => <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-medium">{row.getValue('name')}</code>
      },
      {
        accessorKey: 'count',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Key 数量" />,
        cell: ({ row }) => <span className="tabular-nums">{row.getValue('count')}</span>
      },
      {
        accessorKey: 'ttl',
        header: '过期策略'
      },
      {
        accessorKey: 'description',
        header: '说明',
        enableSorting: false,
        cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('description')}</span>
      }
    ],
    []
  )

  const { table } = useDataTable({ data: keys, columns })

  const stats = info
    ? [
        { label: '缓存模式', value: info.mode, icon: Database },
        { label: 'Key 总数', value: String(info.keyCount), icon: KeyRound },
        { label: '内存占用', value: info.memoryUsed, icon: HardDrive },
        { label: '命中率', value: `${info.hitRate}%`, icon: Gauge }
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">缓存监控</h1>
          <p className="text-muted-foreground text-sm">缓存运行状态与 Key 分布（mock 数据）</p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw />
          刷新
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="py-6">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="py-6">
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
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
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(s => (
              <Card key={s.label}>
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                    <s.icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-sm">{s.label}</p>
                    <p className="truncate text-xl font-bold tabular-nums">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Key 分布</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DataTable table={table} emptyText="暂无缓存数据" />
              <DataTablePagination table={table} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
