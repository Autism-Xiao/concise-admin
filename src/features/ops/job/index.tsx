import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useDataTable } from '@/components/data-table'
import { fetchJobs, type JobItem } from './api'

const columnLabels: Record<string, string> = {
  id: 'ID',
  name: '任务名称',
  cron: '执行表达式',
  status: '状态',
  lastRun: '上次执行',
  nextRun: '下次执行',
  description: '描述'
}

export function JobPage() {
  const [list, setList] = useState<JobItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchJobs()
      .then(setList)
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const jobs = useMemo(() => list ?? [], [list])
  const running = jobs.filter(j => j.status === '运行中').length

  const columns = useMemo<ColumnDef<JobItem>[]>(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="任务名称" />,
        cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>
      },
      {
        accessorKey: 'cron',
        header: '执行表达式',
        cell: ({ row }) => <code className="bg-muted rounded px-1.5 py-0.5 text-xs">{row.getValue('cron')}</code>
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="状态" />,
        cell: ({ row }) => {
          const active = row.getValue<string>('status') === '运行中'
          return (
            <span
              className={
                active ? 'inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground inline-flex items-center gap-1.5'
              }
            >
              <span className={active ? 'size-1.5 rounded-full bg-emerald-500' : 'bg-muted-foreground size-1.5 rounded-full'} />
              {row.getValue('status')}
            </span>
          )
        }
      },
      {
        accessorKey: 'lastRun',
        header: ({ column }) => <DataTableColumnHeader column={column} title="上次执行" />,
        cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{row.getValue('lastRun')}</span>
      },
      {
        accessorKey: 'nextRun',
        header: ({ column }) => <DataTableColumnHeader column={column} title="下次执行" />,
        cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{row.getValue('nextRun')}</span>
      },
      {
        accessorKey: 'description',
        header: '描述',
        enableSorting: false,
        cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('description')}</span>
      }
    ],
    []
  )

  const { table, keyword, setKeyword } = useDataTable({ data: jobs, columns })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">定时任务</h1>
          <p className="text-muted-foreground text-sm">
            共 {jobs.length} 个任务，{running} 个运行中（mock 数据）
          </p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw />
          刷新
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-9 w-full max-w-md" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <p className="text-muted-foreground text-sm">{error}</p>
            <Button variant="outline" onClick={load}>
              重试
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full max-w-xs">
                <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
                <Input placeholder="搜索任务名称 / 描述" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
              <DataTableViewOptions table={table} columnLabels={columnLabels} />
            </div>

            <DataTable table={table} emptyText="没有匹配的任务" />
            <DataTablePagination table={table} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
