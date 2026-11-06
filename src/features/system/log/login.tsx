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
  },
  {
    accessorKey: 'message',
    header: '说明',
    enableSorting: false
  }
]

const extraColumnLabels: Record<string, string> = {
  location: '登录地点',
  browser: '浏览器',
  os: '操作系统',
  message: '说明'
}

export function LoginLogPage() {
  return (
    <LogTablePage
      title="登录日志"
      searchPlaceholder="搜索用户 / IP / 地点"
      fetcher={fetchLoginLogs}
      deleteKind="login"
      extraColumns={extraColumns}
      extraColumnLabels={extraColumnLabels}
      importDescription="只新增不覆盖，可按行返回失败原因。必填列：用户名；「结果」填 成功/失败，留空按成功记录；「登录时间」用 2026-11-06 19:00:00 格式，留空取导入时刻。支持 .xlsx（推荐）与 .csv，单次最多 2000 行。"
      importHint="模板含填写说明与示例；「用户名」列必填"
    />
  )
}
