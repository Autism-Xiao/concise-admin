import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { flexRender, type Row, type Table as TanstackTable } from '@tanstack/react-table'
import { ChevronRight } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface DataTableProps<TData> {
  table: TanstackTable<TData>
  emptyText?: string
  /** 是否显示最左侧的序号列（默认显示） */
  showSerial?: boolean
  /** 是否把最后一列（约定 id 为 actions 的「操作」列）固定在右边缘，默认开启 */
  stickyActions?: boolean
  /**
   * 分组：返回每行所属组 id。组顺序按数据首次出现顺序（想让「平台共享」排最前，
   * 在数据层排好序即可），每组第一行前插入一个组头行；不传则不分组。
   */
  groupOf?: (row: TData) => string
  /** 组头内容（组 id → 节点）；不传显示组 id 原文 */
  groupLabel?: (groupId: string) => ReactNode
}

/** 按 groupOf 把当前页行切成若干连续段（保持出现顺序），无分组时整体视为一段 */
interface GroupSection<TData> {
  /** undefined = 未启用分组（不渲染组头） */
  group?: string
  rows: Array<{ row: Row<TData>; index: number }>
}

export function DataTable<TData>({
  table,
  emptyText = '没有匹配的数据',
  showSerial = true,
  stickyActions = true,
  groupOf,
  groupLabel
}: DataTableProps<TData>) {
  // 序号跟随分页：第 2 页第 1 行接着上一页的 11，而不是又从 1 开始
  const { pageIndex = 0, pageSize = 10 } = table.getState().pagination ?? {}
  const rows = table.getRowModel().rows
  const serialBase = pageIndex * pageSize
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(new Set())

  // 约定：操作列 id 固定叫 actions（各页面一致）。列多的表格会横向滚动，
  // 把这一列 sticky 到右边缘，按钮就不会跟着滚出视野。列被隐藏时不加，避免占位错乱。
  const visibleHeaders = table.getHeaderGroups()[0]?.headers ?? []
  const lastHeader = visibleHeaders[visibleHeaders.length - 1]
  const stickyId = stickyActions && lastHeader?.column.id === 'actions' ? 'actions' : null
  // 组头行 / 空态行需要横跨整行：可见列数 + 序号列
  const totalColSpan = visibleHeaders.length + (showSerial ? 1 : 0)

  // 多选列（id=select）统一提到最左，排在序号前面：
  // 勾选框与行首对齐，序号紧跟其后，视觉上「先选人、再看第几条」。
  const renderHeaderCell = (header: (typeof visibleHeaders)[number]) => (
    <TableHead key={header.id} colSpan={header.colSpan} className={header.column.id === stickyId ? 'table-sticky-action' : undefined}>
      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
    </TableHead>
  )

  const sections = useMemo<Array<GroupSection<TData>>>(() => {
    if (!groupOf) return [{ rows: rows.map((row, index) => ({ row, index })) }]
    const list: Array<GroupSection<TData>> = []
    const byId = new Map<string, GroupSection<TData>>()
    rows.forEach((row, index) => {
      const group = groupOf(row.original)
      let section = byId.get(group)
      if (!section) {
        section = { group, rows: [] }
        byId.set(group, section)
        list.push(section)
      }
      section.rows.push({ row, index })
    })
    return list
  }, [rows, groupOf])

  const toggleGroup = (group: string) =>
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => {
            const selectHeader = headerGroup.headers.find(h => h.column.id === 'select')
            return (
              <TableRow key={headerGroup.id}>
                {selectHeader && renderHeaderCell(selectHeader)}
                {showSerial && <TableHead className="w-14 text-center">序号</TableHead>}
                {headerGroup.headers.filter(h => h.column.id !== 'select').map(renderHeaderCell)}
              </TableRow>
            )
          })}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={totalColSpan} className="text-muted-foreground h-24 text-center">
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            sections.map(section => {
              const collapsed = section.group !== undefined && collapsedGroups.has(section.group)
              return (
                <Fragment key={section.group ?? '__all__'}>
                  {section.group !== undefined && (
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell colSpan={totalColSpan} className="p-0">
                        <button
                          type="button"
                          className="flex w-full items-center gap-1.5 px-2 py-1.5 text-start text-xs font-medium"
                          onClick={() => toggleGroup(section.group!)}
                          aria-expanded={!collapsed}
                        >
                          <ChevronRight className={cn('text-muted-foreground size-3.5 transition-transform', !collapsed && 'rotate-90')} />
                          {groupLabel ? groupLabel(section.group) : section.group}
                          <span className="text-muted-foreground font-normal">{collapsed ? `（已折叠 ${section.rows.length} 项）` : `${section.rows.length} 项`}</span>
                        </button>
                      </TableCell>
                    </TableRow>
                  )}
                  {!collapsed &&
                    section.rows.map(({ row, index }) => {
                      const cells = row.getVisibleCells()
                      const selectCell = cells.find(c => c.column.id === 'select')
                      return (
                        <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                          {selectCell && (
                            <TableCell key={selectCell.id}>{flexRender(selectCell.column.columnDef.cell, selectCell.getContext())}</TableCell>
                          )}
                          {showSerial && (
                            <TableCell className="text-muted-foreground w-14 text-center tabular-nums">{serialBase + index + 1}</TableCell>
                          )}
                          {cells
                            .filter(c => c.column.id !== 'select')
                            .map(cell => (
                              <TableCell key={cell.id} className={cell.column.id === stickyId ? 'table-sticky-action' : undefined}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                        </TableRow>
                      )
                    })}
                </Fragment>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
