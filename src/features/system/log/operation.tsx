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
      deleteKind="oper"
      extraColumns={extraColumns}
      extraColumnLabels={extraColumnLabels}
      importDescription="只新增不覆盖，可按行返回失败原因。必填列：操作人、模块、操作（模块与操作会拼成日志内容）；「结果」填 成功/失败，留空按成功记录；「耗时」为毫秒整数。支持 .xlsx（推荐）与 .csv，单次最多 2000 行。"
      importHint="模板含填写说明与示例；操作人 / 模块 / 操作 三列必填"
    />
  )
}
