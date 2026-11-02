import { useState } from 'react'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState
} from '@tanstack/react-table'

interface UseDataTableOptions<TData> {
  data: TData[]
  columns: ColumnDef<TData>[]
  /** 受控列过滤（如状态下拉），不传或空数组表示不过滤 */
  columnFilters?: ColumnFiltersState
  pageSize?: number
}

// 封装 TanStack Table 常用装配：全局搜索、列过滤、排序、分页
export function useDataTable<TData>({ data, columns, columnFilters, pageSize = 10 }: UseDataTableOptions<TData>) {
  const [keyword, setKeyword] = useState('')

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table v8 API 返回不可记忆化函数，React Compiler 跳过此 hook 即可
  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter: keyword,
      columnFilters: columnFilters ?? []
    },
    onGlobalFilterChange: setKeyword,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } }
  })

  return { table, keyword, setKeyword }
}
