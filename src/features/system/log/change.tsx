import { useCallback, useMemo, useState } from 'react'
import { Eraser, Search } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { RefreshButton } from '@/components/ui/refresh-button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, useServerTable, type ServerTableQuery } from '@/components/data-table'
import { fetchChangeLogs, type ChangeLog, type ChangeLogQuery } from './api'

/** 空值统一显示成「（空）」，否则前端看到一片空白分不清"没改"和"改成空了" */function ValueCell({ text }: { text: string }) {
  if (!text) return <span className="text-muted-foreground text-xs italic">（空）</span>
  const short = text.length > 40 ? `${text.slice(0, 40)}…` : text
  return (
    <span className="block max-w-56 truncate font-mono text-xs" title={text}>
      {short}
    </span>
  )
}

/**
 * 字段变更日志
 *
 * 与「操作日志」的分工：操作日志记"谁调了哪个接口、耗时多少"，
 * 这里记"哪张表的哪条记录的哪个字段从 A 改成了 B"——排查"这个字段什么时候被谁改坏了"用这张表。
 * 密码/密钥/令牌类字段在后端采集时就被过滤，永远不会出现在这里。
 */
export function ChangeLogPage() {
  // 草稿态与已生效条件分开：输入过程中不触发请求，点「查询」才查
  const [draft, setDraft] = useState<ChangeLogQuery>({})
  const [applied, setApplied] = useState<ChangeLogQuery>({})

  /** 服务端分页：条件是「已生效」的那一份，翻页时不会带上未提交的草稿 */
  const fetchPage = useCallback(
    ({ page, pageSize, filters, sortBy, sortOrder }: ServerTableQuery<ChangeLogQuery>) =>
      fetchChangeLogs({ ...filters, page, pageSize, sortBy, sortOrder }),
    []
  )

  const columns = useMemo<ColumnDef<ChangeLog>[]>(
    () => [
      {
        accessorKey: 'time',
        header: ({ column }) => <DataTableColumnHeader column={column} title="时间" />,
        cell: ({ row }) => <span className="text-xs tabular-nums">{row.getValue('time')}</span>
      },
      {
        accessorKey: 'operateUserName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="操作人" />,
        cell: ({ row }) => row.getValue<string | null>('operateUserName') || <span className="text-muted-foreground">系统</span>
      },
      {
        id: 'target',
        accessorFn: row => `${row.tableName} ${row.recordId}`,
        header: '对象',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-medium">{row.original.tableName}</code>
            <p className="text-muted-foreground max-w-40 truncate font-mono text-[11px]" title={row.original.recordId}>
              {row.original.recordId}
            </p>
          </div>
        )
      },
      {
        accessorKey: 'field',
        header: ({ column }) => <DataTableColumnHeader column={column} title="字段" />,
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="text-sm">{row.original.fieldLabel || row.original.field}</p>
            {row.original.fieldLabel && <p className="text-muted-foreground font-mono text-[11px]">{row.original.field}</p>}
          </div>
        )
      },
      {
        accessorKey: 'oldValue',
        header: '变更前',
        enableSorting: false,
        cell: ({ row }) => <ValueCell text={row.original.oldValue} />
      },
      {
        accessorKey: 'newValue',
        header: '变更后',
        enableSorting: false,
        cell: ({ row }) => <ValueCell text={row.original.newValue} />
      }
    ],
    []
  )

  const { table, loading, booted, error, reload } = useServerTable({
    columns,
    query: fetchPage,
    filters: applied,
    pageSize: 20
  })

  /** 列显示开关的中文名；没登记的列回落显示列 id（如 target） */
  const columnLabels: Record<string, string> = {
    time: '时间',
    operateUserName: '操作人',
    target: '对象',
    field: '字段',
    oldValue: '变更前',
    newValue: '变更后'
  }

  const reset = () => {
    setDraft({})
    setApplied({})
  }

  const activeFilters = [applied.tableName, applied.recordId, applied.field, applied.startTime, applied.endTime].filter(Boolean).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">字段变更日志</h1>
        <p className="text-muted-foreground text-sm">数据本身被改了什么：哪张表的哪条记录、哪个字段、从什么改成什么</p>
      </div>

      <Card>
        <CardContent className="space-y-4 py-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs" htmlFor="change-table">
                表名
              </label>
              <Input
                id="change-table"
                placeholder="如 sys_user"
                value={draft.tableName ?? ''}
                onChange={e => setDraft(v => ({ ...v, tableName: e.target.value.trim() || undefined }))}
                onKeyDown={e => e.key === 'Enter' && setApplied(draft)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs" htmlFor="change-record">
                记录 ID
              </label>
              <Input
                id="change-record"
                placeholder="精确匹配"
                value={draft.recordId ?? ''}
                onChange={e => setDraft(v => ({ ...v, recordId: e.target.value.trim() || undefined }))}
                onKeyDown={e => e.key === 'Enter' && setApplied(draft)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs" htmlFor="change-field">
                字段
              </label>
              <Input
                id="change-field"
                placeholder="如 realname"
                value={draft.field ?? ''}
                onChange={e => setDraft(v => ({ ...v, field: e.target.value.trim() || undefined }))}
                onKeyDown={e => e.key === 'Enter' && setApplied(draft)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs" htmlFor="change-start">
                起始日期
              </label>
              <Input
                id="change-start"
                type="date"
                value={draft.startTime ?? ''}
                onChange={e => setDraft(v => ({ ...v, startTime: e.target.value || undefined }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs" htmlFor="change-end">
                结束日期
              </label>
              <Input
                id="change-end"
                type="date"
                value={draft.endTime ?? ''}
                onChange={e => setDraft(v => ({ ...v, endTime: e.target.value || undefined }))}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setApplied(draft)}>
              <Search />
              查询
            </Button>
            <Button variant="ghost" onClick={reset} disabled={activeFilters === 0}>
              <Eraser />
              清除条件
            </Button>
            <span className="text-muted-foreground ml-auto text-xs">服务端分页，按时间倒序</span>
            <RefreshButton onClick={() => void reload()} />
            <DataTableViewOptions table={table} columnLabels={columnLabels} />
          </div>
        </CardContent>
      </Card>

      {!booted ? (
        <Card>
          <CardContent className="py-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <p className="text-muted-foreground text-sm">{error}</p>
            <Button variant="outline" onClick={reload}>
              重试
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4 py-5">
            <DataTable
              table={table}
              loading={loading}
              emptyText={activeFilters > 0 ? '没有符合条件的变更记录' : '还没有任何字段变更记录'}
            />
            <DataTablePagination table={table} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
