import type { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table'
import { fetchOperationLogs, type OperationLog } from './api'
import { LogTablePage } from './components/log-table-page'

const extraColumns: ColumnDef<OperationLog>[] = [
  {
    accessorKey: 'action',
    header: ({ column }) => <DataTableColumnHeader column={column} title="操作类型" />
  },
  {
    accessorKey: 'cost',
    header: ({ column }) => <DataTableColumnHeader column={column} title="耗时" />,
    cell: ({ row }) => <span className="font-mono text-xs">{row.getValue<number>('cost')} ms</span>
  }
]

const extraColumnLabels: Record<string, string> = {
  action: '操作类型',
  cost: '耗时'
}

export function OperationLogPage() {
  return (
    <LogTablePage
      title="操作日志"
      searchPlaceholder="搜索用户 / 操作类型 / IP"
      fetcher={fetchOperationLogs}
      extraColumns={extraColumns}
      extraColumnLabels={extraColumnLabels}
    />
  )
}
