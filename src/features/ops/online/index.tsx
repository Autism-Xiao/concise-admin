import { useEffect, useMemo, useState } from 'react'
import { LogOut, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useDataTable } from '@/components/data-table'
import { hasPermission } from '@/lib/auth'
import { fetchOnlineUsers, formatDateTime, kickUser, type OnlineUser } from './api'

const columnLabels: Record<string, string> = {
  sessionId: '会话编号',
  username: '登录账号',
  dept: '所属部门',
  ip: 'IP 地址',
  location: '登录地点',
  browser: '浏览器',
  os: '操作系统',
  loginTime: '登录时间',
  expiresAt: '过期时间'
}

export function OnlineUsersPage() {
  const [list, setList] = useState<OnlineUser[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [kicking, setKicking] = useState<OnlineUser | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchOnlineUsers()
      .then(res => {
        setList(res.items ?? [])
        setTotal(res.total ?? 0)
      })
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const columns = useMemo<ColumnDef<OnlineUser>[]>(
    () => [
      {
        accessorKey: 'sessionId',
        header: '会话编号',
        enableSorting: false,
        cell: ({ row }) => (
          <code className="text-muted-foreground text-xs" title={row.original.sessionId}>
            {row.original.sessionId.slice(0, 8)}…
          </code>
        )
      },
      {
        accessorKey: 'username',
        header: ({ column }) => <DataTableColumnHeader column={column} title="登录账号" />,
        cell: ({ row }) => (
          <span className="flex items-center gap-2 font-medium">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {row.original.username}
          </span>
        )
      },
      {
        accessorKey: 'dept',
        header: ({ column }) => <DataTableColumnHeader column={column} title="所属部门" />,
        cell: ({ row }) => row.original.dept || '-'
      },
      {
        accessorKey: 'ip',
        header: 'IP 地址',
        cell: ({ row }) => <span className="tabular-nums">{row.original.ip || '-'}</span>
      },
      {
        accessorKey: 'location',
        header: ({ column }) => <DataTableColumnHeader column={column} title="登录地点" />
      },
      {
        accessorKey: 'browser',
        header: '浏览器',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.browser}</span>
      },
      {
        accessorKey: 'os',
        header: '操作系统',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.os}</span>
      },
      {
        accessorKey: 'loginTime',
        header: ({ column }) => <DataTableColumnHeader column={column} title="登录时间" />,
        cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{formatDateTime(row.original.loginTime)}</span>
      },
      {
        accessorKey: 'expiresAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="过期时间" />,
        cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{formatDateTime(row.original.expiresAt)}</span>
      },
      {
        id: 'actions',
        header: () => <div className="text-end">操作</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) =>
          hasPermission('system:online:kick') ? (
            <div className="flex items-center justify-end">
              <Button variant="ghost" size="icon" onClick={() => setKicking(row.original)}>
                <LogOut className="text-destructive size-4" />
                <span className="sr-only">强制下线</span>
              </Button>
            </div>
          ) : null
      }
    ],
    []
  )

  const { table, keyword, setKeyword } = useDataTable({ data: list, columns })

  const handleKick = async () => {
    if (!kicking) return
    try {
      await kickUser(kicking.sessionId)
      toast.success(`已将「${kicking.username}」强制下线`)
      setKicking(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">在线用户</h1>
          <p className="text-muted-foreground text-sm">
            当前共 {total} 人在线（来自 Redis 实时会话{total > list.length ? `，展示最近登录的 ${list.length} 个` : ''}）
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
                <Input placeholder="搜索账号 / 部门 / IP" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
              <DataTableViewOptions table={table} columnLabels={columnLabels} />
            </div>

            <DataTable table={table} emptyText="没有匹配的在线用户" />
            <DataTablePagination table={table} />
          </CardContent>
        </Card>
      )}

      <ConfirmDeleteDialog
        open={!!kicking}
        onOpenChange={v => !v && setKicking(null)}
        title="强制下线"
        description={<>即将把「{kicking?.username}」踢下线，其令牌立即失效并需重新登录。</>}
        onConfirm={handleKick}
      />
    </div>
  )
}
