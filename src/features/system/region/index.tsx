import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronRight, ChevronsDown, ChevronsDownUp, MapPin, Pencil, Plus, RefreshCw, Search, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { RegionFormDialog } from './components/region-form-dialog'
import { RegionImportDialog } from './components/region-import-dialog'
import { deleteRegion, fetchRegionChildren, fetchRegionStats, fetchRegions, type Region, type RegionStats } from './api'

/** 省级区划的 parentCode 固定为 '0' */
const ROOT_CODE = '0'
/** 搜索结果最多渲染条数：既是前端渲染上限，也是请求后端的 limit（超出的部分不下发，省流量） */
const SEARCH_LIMIT = 500

const LEVEL_ITEMS: Record<string, string> = { '': '全部层级', '0': '省份', '1': '城市', '2': '区县', '3': '街道' }

const LEVEL_TEXTS: Record<number, string> = { 0: '省份', 1: '城市', 2: '区县', 3: '街道' }

const LEVEL_BADGE: Record<number, string> = {
  0: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  1: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  2: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  3: 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
}

function formatCount(n: number) {
  return n.toLocaleString('zh-CN')
}

/**
 * 行政区划管理（树形懒加载）
 *
 * 为什么不做一次性全量树：sys_region 有 4 万多行（省级 34 / 市级 343 / 区县 3255 / 街道 4.1 万），
 * 全量 JSON 约 12 MB、后端 buildRegionTree 还是 O(n²) 递归 —— 打开页面就卡死。
 * 所以按「展开哪层查哪层」走 GET /regions/children/:parentCode，子级结果按 areaCode 缓存在 childMap，
 * 收起再展开不重复请求。
 *
 * 搜索仍然走 flat 列表接口：搜索结果跨层级，平铺（带层级徽标）才看得懂，树形反而藏数据。
 *
 * 布局固定一屏：页面 h-full，卡片 flex-1 吃掉剩余高度，表格自带竖向滚动 + 吸顶表头。
 * 展开/搜索命中再多也只是表内滚动，页面本身不出现第二条滚动条（否则表头滚没了不知道在看哪列）。
 */
export function RegionPage() {
  const [roots, setRoots] = useState<Region[] | null>(null)
  const [stats, setStats] = useState<RegionStats | null>(null)
  const [childMap, setChildMap] = useState<Record<string, Region[]>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loadingCodes, setLoadingCodes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandingAll, setExpandingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [searchRows, setSearchRows] = useState<Region[] | null>(null)
  /** 搜索真实命中数（后端 total，可能大于已下发的 SEARCH_LIMIT 条） */
  const [searchTotal, setSearchTotal] = useState(0)
  const [searching, setSearching] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Region | null>(null)
  const [deleting, setDeleting] = useState<Region | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const filtering = keyword.trim() !== ''

  // 刷新要保留展开状态，但 loadTree 不能依赖 expanded（否则每次展开都会重跑 effect）
  const expandedRef = useRef(expanded)
  useEffect(() => {
    expandedRef.current = expanded
  }, [expanded])

  /** 批量拉若干节点的子级并写入缓存（失败的节点保持未缓存，允许下次重试） */
  const fetchChildrenMap = useCallback(async (codes: string[]) => {
    if (!codes.length) return
    const pairs = await Promise.all(codes.map(async code => [code, await fetchRegionChildren(code).catch(() => null)] as const))
    setChildMap(prev => {
      const next = { ...prev }
      for (const [code, children] of pairs) {
        if (children) next[code] = children
      }
      return next
    })
  }, [])

  /**
   * 加载树。
   * - keepExpanded=false：整棵树重置为「只显示省级」（首次进入 / 手动重置）
   * - keepExpanded=true：静默刷新根节点 + 已展开节点的子级，不闪骨架屏、不丢展开状态
   */
  const loadTree = useCallback(
    (keepExpanded = false) => {
      const keep = keepExpanded ? [...expandedRef.current] : []
      if (keepExpanded) {
        setRefreshing(true)
      } else {
        setLoading(true)
        setExpanded(new Set())
        setChildMap({})
      }
      setError(null)
      fetchRegionChildren(ROOT_CODE)
        .then(nodes => {
          setRoots(nodes)
          if (keep.length) void fetchChildrenMap(keep)
        })
        .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
        .finally(() => {
          setLoading(false)
          setRefreshing(false)
        })
      fetchRegionStats()
        .then(setStats)
        .catch(() => setStats(null))
    },
    [fetchChildrenMap]
  )

  useEffect(() => {
    loadTree()
  }, [loadTree])

  /** 展开节点时按需拉子级；已缓存的直接复用 */
  const loadChildren = useCallback(
    async (node: Region) => {
      const code = node.areaCode
      if (childMap[code] || node.level >= 3) return
      setLoadingCodes(prev => new Set(prev).add(code))
      try {
        const children = await fetchRegionChildren(code)
        setChildMap(prev => ({ ...prev, [code]: children }))
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '加载下级区划失败')
        setExpanded(prev => {
          const next = new Set(prev)
          next.delete(code)
          return next
        })
      } finally {
        setLoadingCodes(prev => {
          const next = new Set(prev)
          next.delete(code)
          return next
        })
      }
    },
    [childMap]
  )

  const toggleNode = (node: Region) => {
    const code = node.areaCode
    const willExpand = !expanded.has(code)
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
    if (willExpand) void loadChildren(node)
  }

  const collapseAll = () => setExpanded(new Set())

  /** 一键展开省级：34 个省级并发拉一次子级，展开后百余行，用来直观确认层级结构 */
  const expandProvinces = async () => {
    if (!roots?.length) return
    setExpandingAll(true)
    try {
      const pending = roots.filter(node => !childMap[node.areaCode] && node.level < 3).map(node => node.areaCode)
      await fetchChildrenMap(pending)
      setExpanded(new Set(roots.map(node => node.areaCode)))
    } finally {
      setExpandingAll(false)
    }
  }

  // 搜索：关键字/层级变化后防抖 300ms 请求，结果平铺展示
  useEffect(() => {
    if (!filtering) {
      setSearchRows(null)
      setSearchTotal(0)
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(() => {
      fetchRegions({ keyword, level: levelFilter === '' ? undefined : Number(levelFilter), limit: SEARCH_LIMIT })
        .then(res => {
          if (cancelled) return
          setSearchRows(res.records)
          setSearchTotal(res.total ?? res.records.length)
        })
        .catch(e => {
          if (!cancelled) {
            setSearchRows([])
            setSearchTotal(0)
            toast.error(e instanceof Error ? e.message : '搜索失败')
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false)
        })
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [filtering, keyword, levelFilter, reloadKey])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (region: Region) => {
    setEditing(region)
    setFormOpen(true)
  }

  /** 保存/删除/导入后：树静默刷新（保留展开），搜索视图重新查询 */
  const refresh = () => {
    loadTree(true)
    setReloadKey(k => k + 1)
  }

  const handleDelete = async () => {
    if (!deleting) return
    const target = deleting
    setDeleting(null)
    try {
      await deleteRegion(target.id)
      toast.success(`已删除区划「${target.name}」`)
      refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  const statsText = useMemo(() => {
    if (!stats) return '按需加载（点省级前面的箭头逐层展开下级）'
    const parts = [`共 ${formatCount(stats.total)} 条区划`]
    for (const level of [0, 1, 2, 3]) {
      const count = stats.byLevel[level] ?? 0
      if (count > 0) parts.push(`${LEVEL_TEXTS[level]} ${formatCount(count)}`)
    }
    return parts.join(' · ')
  }, [stats])

  const visibleSearchRows = useMemo(() => (searchRows ? searchRows.slice(0, SEARCH_LIMIT) : []), [searchRows])

  /** 渲染树行：只有展开且已加载的节点才递归渲染子级 */
  const renderRows = (nodes: Region[], depth: number, expandable: boolean, counter: { n: number } = { n: 0 }): ReactNode[] =>
    nodes.flatMap(node => {
      const children = childMap[node.areaCode]
      const hasChildren = expandable && (children ? children.length > 0 : node.level < 3)
      const isOpen = expandable && expanded.has(node.areaCode)
      const loadingKids = loadingCodes.has(node.areaCode)

      const row = (
        <TableRow key={node.id}>
          <TableCell className="text-muted-foreground w-14 text-center tabular-nums">{++counter.n}</TableCell>
          <TableCell>
            <div className="flex items-center gap-1" style={{ paddingInlineStart: depth * 20 }}>
              {hasChildren ? (
                <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={() => toggleNode(node)}>
                  <ChevronRight className={`size-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  <span className="sr-only">展开 / 收起</span>
                </Button>
              ) : (
                <span className="size-6 shrink-0" />
              )}
              <MapPin className="text-muted-foreground size-4 shrink-0" />
              <span className="font-medium">{node.name}</span>
              {node.shortName && node.shortName !== node.name && <span className="text-muted-foreground text-xs">{node.shortName}</span>}
            </div>
          </TableCell>
          <TableCell>
            <code className="bg-muted rounded px-1.5 py-0.5 text-xs tabular-nums">{node.areaCode}</code>
          </TableCell>
          <TableCell>
            <span className={`rounded px-1.5 py-0.5 text-xs ${LEVEL_BADGE[node.level] ?? 'bg-muted text-muted-foreground'}`}>
              {node.levelText || LEVEL_TEXTS[node.level] || '-'}
            </span>
          </TableCell>
          <TableCell>
            <code className="text-muted-foreground text-xs">{node.parentCode}</code>
          </TableCell>
          <TableCell>
            <span className="text-muted-foreground tabular-nums">{node.zipCode || '-'}</span>
          </TableCell>
          <TableCell>
            <span className="text-muted-foreground text-xs tabular-nums">{node.lng && node.lat ? `${node.lng}, ${node.lat}` : '-'}</span>
          </TableCell>
          <TableCell className="text-end">
            <Button variant="ghost" size="icon" onClick={() => openEdit(node)}>
              <Pencil className="size-4" />
              <span className="sr-only">编辑</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleting(node)}>
              <Trash2 className="text-destructive size-4" />
              <span className="sr-only">删除</span>
            </Button>
          </TableCell>
        </TableRow>
      )

      if (!isOpen) return [row]
      const hintCell = (text: string) => (
        <TableRow key={`${node.id}-hint`}>
          <TableCell colSpan={8} className="text-muted-foreground py-2 text-xs" style={{ paddingInlineStart: depth * 20 + 56 }}>
            {text}
          </TableCell>
        </TableRow>
      )
      if (loadingKids) return [row, hintCell('加载下级区划…')]
      if (!children || children.length === 0) return [row, hintCell('暂无下级区划')]
      return [row, ...renderRows(children, depth + 1, expandable, counter)]
    })

  const emptyRow = (text: string) => (
    <TableRow>
      <TableCell colSpan={8} className="text-muted-foreground py-10 text-center">
        {text}
      </TableCell>
    </TableRow>
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">行政区划</h1>
          <p className="text-muted-foreground text-sm">{statsText}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload />
            导入区划
          </Button>
          <Button variant="outline" onClick={refresh} disabled={refreshing}>
            <RefreshCw />
            {refreshing ? '刷新中…' : '刷新'}
          </Button>
          <Button onClick={openCreate}>
            <Plus />
            新增区划
          </Button>
        </div>
      </div>

      {/* 整页只占一屏：卡片吃掉剩余高度，数据超出只在表格内滚动，页面本身不再上下跑 */}
      {loading ? (
        <Card className="flex min-h-0 flex-1 flex-col">
          <CardContent className="flex min-h-0 flex-1 flex-col space-y-3 py-6">
            <Skeleton className="h-9 w-full max-w-md shrink-0" />
            <Skeleton className="min-h-0 w-full flex-1" />
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="flex min-h-0 flex-1 flex-col">
          <CardContent className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-12">
            <p className="text-muted-foreground text-sm">{error}</p>
            <Button variant="outline" onClick={() => loadTree()}>
              重试
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex min-h-0 flex-1 flex-col">
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <div className="relative w-full max-w-xs">
                <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
                <Input placeholder="搜索名称 / 代码 / 拼音" className="ps-8" value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
              {filtering ? (
                <>
                  <Select value={levelFilter} onValueChange={setLevelFilter} items={LEVEL_ITEMS}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LEVEL_ITEMS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground text-xs">
                    {searching
                      ? '搜索中…'
                      : searchTotal > SEARCH_LIMIT
                        ? `命中 ${formatCount(searchTotal)} 条，仅显示前 ${SEARCH_LIMIT} 条，请细化关键字`
                        : `命中 ${formatCount(searchTotal)} 条`}
                  </span>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={expandProvinces} disabled={expandingAll || !roots?.length}>
                    <ChevronsDown />
                    {expandingAll ? '展开中…' : '展开省级'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={collapseAll} disabled={expanded.size === 0}>
                    <ChevronsDownUp />
                    收起全部
                  </Button>
                </>
              )}
            </div>

            <Table containerClassName="min-h-0 flex-1 overflow-y-auto rounded-md border">
              <TableHeader className="bg-card sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-14 text-center">序号</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead className="w-40">区划代码</TableHead>
                  <TableHead className="w-20">层级</TableHead>
                  <TableHead className="w-32">上级代码</TableHead>
                  <TableHead className="w-24">邮编</TableHead>
                  <TableHead className="w-44">经纬度</TableHead>
                  <TableHead className="w-24 text-end">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtering
                  ? visibleSearchRows.length
                    ? renderRows(visibleSearchRows, 0, false)
                    : emptyRow(searching ? '搜索中…' : '没有匹配的区划')
                  : roots && roots.length
                    ? renderRows(roots, 0, true)
                    : emptyRow('暂无区划数据，可通过「导入区划」批量维护，或点右上角「新增区划」')}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {formOpen && <RegionFormDialog key={editing?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} region={editing} onSaved={refresh} />}

      <RegionImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={refresh} />

      <ConfirmDialog
        confirmText="删除"
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        description={<>即将删除区划「{deleting?.name}」。存在下级区划时会被拒绝，请先删除下级。</>}
        onConfirm={handleDelete}
      />
    </div>
  )
}
