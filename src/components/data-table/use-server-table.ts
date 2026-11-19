import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
  type SortingState
} from '@tanstack/react-table'
import type { PageResult } from '@/lib/http'

/**
 * 传给后端列表接口的查询参数
 *
 * 字段名与后端 PagerDto 对齐（page/pageSize/keyword/sortBy/sortOrder），
 * `filters` 是各页面自己的额外筛选（状态、类型、部门…），由页面展开成接口参数。
 */
export interface ServerTableQuery<TFilters> {
  /** 从 1 开始 */
  page: number
  pageSize: number
  /** 已 trim 的关键字，空串表示不筛 */
  keyword: string
  filters: TFilters
  /** 命中的列 id；未排序时不传 */
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

interface UseServerTableOptions<TData, TFilters> {
  columns: ColumnDef<TData>[]
  /**
   * 取数函数
   *
   * 每次翻页/搜索/排序/换筛选条件都会调用一次。函数标识变化会触发重新请求，
   * 所以页面里用 useCallback 包一层（依赖只放真正影响请求的参数）。
   */
  query: (params: ServerTableQuery<TFilters>) => Promise<PageResult<TData>>
  /** 额外筛选条件（对象内容变化才会重新请求，引用变化不影响） */
  filters?: TFilters
  /** 初始每页条数，默认 10 */
  pageSize?: number
  getRowId?: (row: TData) => string
  /** 默认隐藏的列 id（只在首次渲染生效） */
  hiddenColumns?: string[]
  /** 关键字防抖毫秒，默认 300；传 0 表示不防抖（回车触发型页面用） */
  debounceMs?: number
  /** 为 false 时不发请求（如权限不足/依赖数据未就绪） */
  enabled?: boolean
}

/**
 * 服务端表格：搜索、筛选、排序、分页全部交给接口
 *
 * 与 `useDataTable`（客户端模式）的分工：
 * - 数据量会增长、或已经做了后端分页的表（用户/公告/任务/日志/字典…）→ 本 hook
 * - 树形结构、字典项、配置分组、缓存 key 这类「天然全量且必须一次性看全」的数据 → useDataTable
 *
 * 排序走 `manualSorting`：点表头只改排序状态并发请求，**不会**在本页数据上排，
 * 否则用户会看到「第 1 页按金额降序，第 2 页金额反而更大」的假排序。
 */
export function useServerTable<TData, TFilters = Record<string, never>>({
  columns,
  query,
  filters,
  pageSize: initialPageSize = 10,
  getRowId,
  hiddenColumns,
  debounceMs = 300,
  enabled = true
}: UseServerTableOptions<TData, TFilters>) {
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: initialPageSize })
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [rows, setRows] = useState<TData[]>([])
  /** -1 = 后端本次没统计总数（skipCount 快路径），此时只按「还有下一页」翻页 */
  const [total, setTotal] = useState(-1)
  const [loading, setLoading] = useState(true)
  /** 首次加载是否已完成：骨架屏只在未启动时展示，之后的搜索/翻页保持表格挂载，只做轻量遮罩 */
  const [booted, setBooted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  /** 请求序号：只认最后一次发出的请求，防止慢请求覆盖新结果（快速输入时必然出现） */
  const requestId = useRef(0)

  // query 每次渲染都可能是新函数（页面内联箭头函数），放 ref 里避免把它变成请求依赖
  const queryRef = useRef(query)
  queryRef.current = query

  // 关键字防抖：连打 5 个字不该打 5 次接口
  useEffect(() => {
    if (!debounceMs) {
      setDebouncedKeyword(keyword)
      return
    }
    const timer = setTimeout(() => setDebouncedKeyword(keyword), debounceMs)
    return () => clearTimeout(timer)
  }, [keyword, debounceMs])

  // 换了关键字必须回到第 1 页：否则「在第 5 页搜索」会搜出空结果，看起来像没搜到
  useEffect(() => {
    setPagination(prev => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }))
  }, [debouncedKeyword])

  // filters 是对象字面量，按内容比较；引用变化不触发请求
  const filtersKey = JSON.stringify(filters ?? {})
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 只认内容，不认引用
  const stableFilters = useMemo(() => (filters ?? {}) as TFilters, [filtersKey])

  const sortBy = sorting[0]?.id
  const sortOrder = sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined

  useEffect(() => {
    if (!enabled) return
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    queryRef
      .current({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        keyword: debouncedKeyword.trim(),
        filters: stableFilters,
        ...(sortBy ? { sortBy, sortOrder } : {})
      })
      .then(res => {
        if (id !== requestId.current) return
        const records = res.records ?? []
        const nextTotal = typeof res.total === 'number' ? res.total : -1
        setRows(records)
        setTotal(nextTotal)
        // 删掉最后一页的最后一条后，当前页已越界：回退到最后一页，而不是停在空表格上
        if (!records.length && pagination.pageIndex > 0 && nextTotal >= 0) {
          const lastPage = Math.max(Math.ceil(nextTotal / pagination.pageSize) - 1, 0)
          setPagination(prev => ({ ...prev, pageIndex: Math.min(lastPage, prev.pageIndex) }))
        }
      })
      .catch(e => {
        if (id !== requestId.current) return
        setRows([])
        setTotal(-1)
        setError(e instanceof Error ? e.message : '加载失败')
      })
      .finally(() => {
        if (id === requestId.current) {
          setLoading(false)
          setBooted(true)
        }
      })
  }, [enabled, pagination.pageIndex, pagination.pageSize, debouncedKeyword, sortBy, sortOrder, stableFilters, reloadKey])

  const pageCount = total >= 0 ? Math.max(Math.ceil(total / pagination.pageSize), 1) : -1

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table v8 API 返回不可记忆化函数，React Compiler 跳过此 hook 即可
  const table = useReactTable({
    data: rows,
    columns,
    state: { pagination, sorting, rowSelection },
    pageCount,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    onPaginationChange: updater =>
      setPagination(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        // 换每页条数时回第一页：沿用旧页码大概率越界
        return next.pageSize !== prev.pageSize ? { ...next, pageIndex: 0 } : next
      }),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    ...(hiddenColumns?.length ? { initialState: { columnVisibility: Object.fromEntries(hiddenColumns.map(id => [id, false])) } } : {})
  })

  /** 写操作成功后重新拉当前页（保留搜索/筛选/排序状态） */
  const reload = useCallback(() => setReloadKey(key => key + 1), [])

  return { table, keyword, setKeyword, loading, booted, error, total, reload, rowSelection, setRowSelection, pageIndex: pagination.pageIndex }
}

/** 从 PageResult 里安全取 records（接口异常时后端可能不回 records） */
export function pickRecords<T>(res: PageResult<T> | undefined): T[] {
  return res?.records ?? []
}
