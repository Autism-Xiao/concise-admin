import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useDataTable } from '@/components/data-table'
import { fetchOnlineUsers, type OnlineUser } from './api'

const columnLabels: Record<string, string> = {
  sessionId: '会话编号',
  username: '登录账号',
  dept: '所属部门',
  ip: 'IP 地址',
  location: '登录地点',
  browser: '浏览器',
  os: '操作系统',
  loginTime: '登录时间'
}

export function OnlineUsersPage() {
  const [list, setList] = useState<OnlineUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchOnlineUsers()
      .then(setList)
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const users = useMemo(() => list ?? [], [list])

  const columns = useMemo<ColumnDef<OnlineUser>[]>(
    () => [
      {
        accessorKey: 'sessionId',
        header: '会话编号',
        cell: ({ row }) => <code className="text-muted-foreground text-xs">{row.getValue('sessionId')}</code>
      },
      {
        accessorKey: 'username',
        header: ({ column }) => <DataTableColumnHeader column={column} title="登录账号" />,
        cell: ({ row }) => (
          <span className="flex items-center gap-2 font-medium">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {row.getValue('username')}
          </span>
        )
      },
      {
        accessorKey: 'dept',
        header: ({ column }) => <DataTableColumnHeader column={column} title="所属部门" />
      },
      {
        accessorKey: 'ip',
        header: 'IP 地址',
        cell: ({ row }) => <span className="tabular-nums">{row.getValue('ip')}</span>
      },
      {
        accessorKey: 'location',
        header: ({ column }) => <DataTableColumnHeader column={column} title="登录地点" />
      },
      {
        accessorKey: 'browser',
        header: '浏览器',
        cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('browser')}</span>
      },
      {
        accessorKey: 'os',
        header: '操作系统',
        cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('os')}</span>
      },
      {
        accessorKey: 'loginTime',
        header: ({ column }) => <DataTableColumnHeader column={column} title="登录时间" />,
        cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{row.getValue('loginTime')}</span>
      }
    ],
    []
  )

  const { table, keyword, setKeyword } = useDataTable({ data: users, columns })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">在线用户</h1>
          <p className="text-muted-foreground text-sm">当前共 {users.length} 人在线（mock 数据）</p>
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
                <Input placeholder="搜索账号 / 部门 / IP" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
              <DataTableViewOptions table={table} columnLabels={columnLabels} />
            </div>

            <DataTable table={table} emptyText="没有匹配的在线用户" />
            <DataTablePagination table={table} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
