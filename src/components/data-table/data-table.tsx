import { flexRender, type Table as TanstackTable } from '@tanstack/react-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface DataTableProps<TData> {
  table: TanstackTable<TData>
  emptyText?: string
  /** 是否显示最左侧的序号列（默认显示） */
  showSerial?: boolean
  /** 是否把最后一列（约定 id 为 actions 的「操作」列）固定在右边缘，默认开启 */
  stickyActions?: boolean
}

export function DataTable<TData>({ table, emptyText = '没有匹配的数据', showSerial = true, stickyActions = true }: DataTableProps<TData>) {
  const columns = table.getAllColumns()
  // 序号跟随分页：第 2 页第 1 行接着上一页的 11，而不是又从 1 开始
  const { pageIndex = 0, pageSize = 10 } = table.getState().pagination ?? {}
  const rows = table.getRowModel().rows
  const serialBase = pageIndex * pageSize

  // 约定：操作列 id 固定叫 actions（各页面一致）。列多的表格会横向滚动，
  // 把这一列 sticky 到右边缘，按钮就不会跟着滚出视野。列被隐藏时不加，避免占位错乱。
  const visibleHeaders = table.getHeaderGroups()[0]?.headers ?? []
  const lastHeader = visibleHeaders[visibleHeaders.length - 1]
  const stickyId = stickyActions && lastHeader?.column.id === 'actions' ? 'actions' : null

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {showSerial && <TableHead className="w-14 text-center">序号</TableHead>}
              {headerGroup.headers.map(header => (
                <TableHead key={header.id} colSpan={header.colSpan} className={header.column.id === stickyId ? 'table-sticky-action' : undefined}>
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
                  <TableCell key={cell.id} className={cell.column.id === stickyId ? 'table-sticky-action' : undefined}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
