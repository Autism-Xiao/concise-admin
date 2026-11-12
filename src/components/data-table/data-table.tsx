import { flexRender, type Table as TanstackTable } from '@tanstack/react-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface DataTableProps<TData> {
  table: TanstackTable<TData>
  emptyText?: string
  /** 是否显示最左侧的序号列（默认显示） */
  showSerial?: boolean
}

export function DataTable<TData>({ table, emptyText = '没有匹配的数据', showSerial = true }: DataTableProps<TData>) {
  const columns = table.getAllColumns()
  // 序号跟随分页：第 2 页第 1 行接着上一页的 11，而不是又从 1 开始
  const { pageIndex = 0, pageSize = 10 } = table.getState().pagination ?? {}
  const rows = table.getRowModel().rows
  const serialBase = pageIndex * pageSize

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {showSerial && <TableHead className="w-14 text-center">序号</TableHead>}
              {headerGroup.headers.map(header => (
                <TableHead key={header.id} colSpan={header.colSpan}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (showSerial ? 1 : 0)} className="text-muted-foreground h-24 text-center">
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                {showSerial && <TableCell className="text-muted-foreground w-14 text-center tabular-nums">{serialBase + index + 1}</TableCell>}
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
