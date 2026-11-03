import type { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table'
import { fetchLoginLogs, type LoginLog } from './api'
import { LogTablePage } from './components/log-table-page'

const extraColumns: ColumnDef<LoginLog>[] = [
  {
    accessorKey: 'location',
    header: ({ column }) => <DataTableColumnHeader column={column} title="登录地点" />
  },
  {
    accessorKey: 'browser',
    header: '浏览器',
    enableSorting: false
  },
  {
    accessorKey: 'os',
    header: '操作系统',
    enableSorting: false
  }
]

const extraColumnLabels: Record<string, string> = {
  location: '登录地点',
  browser: '浏览器',
  os: '操作系统'
}

export function LoginLogPage() {
  return (
    <LogTablePage
      title="登录日志"
      searchPlaceholder="搜索用户 / IP / 地点"
      fetcher={fetchLoginLogs}
      extraColumns={extraColumns}
      extraColumnLabels={extraColumnLabels}
    />
  )
}
