import { useState } from 'react'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState
} from '@tanstack/react-table'

interface UseDataTableOptions<TData> {
  data: TData[]
  columns: ColumnDef<TData>[]
  /** 受控列过滤（如状态下拉），不传或空数组表示不过滤 */
  columnFilters?: ColumnFiltersState
  pageSize?: number
  /** 行 id 取值（多选场景建议传，避免刷新后选择状态错位） */
  getRowId?: (row: TData) => string
  /**
   * 默认隐藏的列 id
   *
   * 窄屏下宽表必然横向滚动，把「内部主键 / 长文本备注」这类低信息密度列默认收起，
   * 首屏就能看到真正要看的数据与操作列。用户仍可在「列显示」里打开。
   * 只在首次渲染生效（跟随 TanStack 的 initialState 语义）。
   */
  hiddenColumns?: string[]
}

const EMPTY_FILTERS: ColumnFiltersState = []

// 封装 TanStack Table 常用装配：全局搜索、列过滤、排序、分页、行多选
export function useDataTable<TData>({ data, columns, columnFilters, pageSize = 10, getRowId, hiddenColumns }: UseDataTableOptions<TData>) {
  const [keyword, setKeyword] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table v8 API 返回不可记忆化函数，React Compiler 跳过此 hook 即可
  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter: keyword,
      columnFilters: columnFilters ?? EMPTY_FILTERS,
      rowSelection
    },
    onGlobalFilterChange: setKeyword,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize },
      ...(hiddenColumns?.length ? { columnVisibility: Object.fromEntries(hiddenColumns.map(id => [id, false])) } : {})
    }
  })

  return { table, keyword, setKeyword, rowSelection, setRowSelection }
}
