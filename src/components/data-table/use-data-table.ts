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
  /**
   * 关键字已经由接口过滤（服务端搜索），前端不再本地二次过滤
   *
   * 用于「小表 + 服务端搜索」的组合（角色/岗位/职级/租户/字典）：
   * 数据仍一次全量取回（要展示分组/整棵树），但搜索词交给后端，
   * 避免前后端过滤口径不一致（比如后端只搜名称/编码，本地还搜了描述）。
   */
  manualFiltering?: boolean
  /**
   * 关键字变化回调（配合 manualFiltering 用）
   *
   * 页面拿它去发接口请求（自己加防抖）。普通本地过滤模式不需要传。
   */
  onKeywordChange?: (keyword: string) => void
}

const EMPTY_FILTERS: ColumnFiltersState = []

// 封装 TanStack Table 常用装配：全局搜索、列过滤、排序、分页、行多选
export function useDataTable<TData>({
  data,
  columns,
  columnFilters,
  pageSize = 10,
  getRowId,
  hiddenColumns,
  manualFiltering = false,
  onKeywordChange
}: UseDataTableOptions<TData>) {
  const [keyword, setKeyword] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table v8 API 返回不可记忆化函数，React Compiler 跳过此 hook 即可
  const table = useReactTable({
    data,
    columns,
    state: {
      // 服务端过滤时把 globalFilter 置空：关键字只用于发请求，不再参与本地行过滤
      globalFilter: manualFiltering ? undefined : keyword,
      // 列筛选（状态下拉等）不受影响：小表全量在本地，这类筛选仍走本地更快
      columnFilters: columnFilters ?? EMPTY_FILTERS,
      rowSelection
    },
    onGlobalFilterChange: updater => {
      const next = typeof updater === 'function' ? updater(keyword) : updater
      setKeyword(next)
      onKeywordChange?.(next)
    },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // 列筛选要用过滤模型；只关掉全局（关键字）过滤时也必须保留它
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize },
      ...(hiddenColumns?.length ? { columnVisibility: Object.fromEntries(hiddenColumns.map(id => [id, false])) } : {})
    }
  })

  return { table, keyword, setKeyword, rowSelection, setRowSelection }
}
