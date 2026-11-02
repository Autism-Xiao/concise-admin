import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { HOME_PATH, isRegisteredPage } from '@/config/page-registry'

const STORAGE_KEY = 'concise-tabs'
const MAX_TABS = 12

export interface TabItem {
  path: string
  /** 固定标签不可关闭（如仪表盘） */
  pinned?: boolean
}

interface TabsContextValue {
  tabs: TabItem[]
  /** 每个标签的刷新计数，自增触发对应页面重挂载 */
  nonces: Record<string, number>
  closeTab: (path: string) => void
  closeOthers: (path: string) => void
  closeSide: (path: string, side: 'left' | 'right') => void
  closeAll: () => void
  refreshTab: (path: string) => void
  reorderTabs: (from: number, to: number) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

function loadPersistedTabs(): TabItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { tabs?: TabItem[] }
    return (parsed.tabs ?? []).filter(t => t && isRegisteredPage(t.path))
  } catch {
    return []
  }
}

export function TabsProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const pathname = useLocation({ select: location => location.pathname })
  const [tabs, setTabs] = useState<TabItem[]>(() => {
    const restored = loadPersistedTabs()
    const home: TabItem = { path: HOME_PATH, pinned: true }
    return restored.some(t => t.path === HOME_PATH)
      ? restored.map(t => (t.path === HOME_PATH ? { ...t, pinned: true } : t))
      : [home, ...restored]
  })
  const [nonces, setNonces] = useState<Record<string, number>>({})
  // 供 navigate 副作用读取最新 tabs
  const tabsRef = useRef(tabs)
  useEffect(() => {
    tabsRef.current = tabs
  }, [tabs])

  // 路由变化时自动开标签；超上限时关掉最早的非固定、非当前标签
  useEffect(() => {
    if (!isRegisteredPage(pathname)) return
    setTabs(prev => {
      if (prev.some(t => t.path === pathname)) return prev
      let next = [...prev, { path: pathname }]
      while (next.length > MAX_TABS) {
        const idx = next.findIndex(t => !t.pinned && t.path !== pathname)
        if (idx === -1) break
        next = next.filter((_, i) => i !== idx)
      }
      return next
    })
  }, [pathname])

  // 持久化标签列表（顺序与固定状态），刷新浏览器后恢复
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs }))
    } catch {
      // 存储不可用时静默降级为不持久化
    }
  }, [tabs])

  const goto = useCallback(
    (path: string) => {
      void navigate({ to: path as never })
    },
    [navigate]
  )

  const closeTab = useCallback(
    (path: string) => {
      const current = tabsRef.current
      const target = current.find(t => t.path === path)
      if (!target || target.pinned) return
      const idx = current.findIndex(t => t.path === path)
      const next = current.filter(t => t.path !== path)
      setTabs(next)
      // 关闭的是当前页：优先回到左侧邻居，其次右侧，最后回仪表盘
      if (path === pathname) {
        const fallback = next[idx - 1] ?? next[idx] ?? next[next.length - 1]
        if (fallback) goto(fallback.path)
      }
    },
    [pathname, goto]
  )

  const closeOthers = useCallback(
    (path: string) => {
      setTabs(prev => prev.filter(t => t.pinned || t.path === path))
      if (pathname !== path) goto(path)
    },
    [pathname, goto]
  )

  const closeSide = useCallback(
    (path: string, side: 'left' | 'right') => {
      const current = tabsRef.current
      const idx = current.findIndex(t => t.path === path)
      if (idx === -1) return
      setTabs(prev =>
        prev.filter((t, i) => t.pinned || (side === 'left' ? i >= idx : i <= idx))
      )
      // 当前页被关掉时回到操作的标签
      const stillThere = current
        .filter((t, i) => t.pinned || (side === 'left' ? i >= idx : i <= idx))
        .some(t => t.path === pathname)
      if (!stillThere) goto(path)
    },
    [pathname, goto]
  )

  const closeAll = useCallback(() => {
    setTabs(prev => prev.filter(t => t.pinned))
    if (pathname !== HOME_PATH) goto(HOME_PATH)
  }, [pathname, goto])

  const refreshTab = useCallback((path: string) => {
    setNonces(prev => ({ ...prev, [path]: (prev[path] ?? 0) + 1 }))
  }, [])

  const reorderTabs = useCallback((from: number, to: number) => {
    setTabs(prev => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }, [])

  const value = useMemo<TabsContextValue>(
    () => ({ tabs, nonces, closeTab, closeOthers, closeSide, closeAll, refreshTab, reorderTabs }),
    [tabs, nonces, closeTab, closeOthers, closeSide, closeAll, refreshTab, reorderTabs]
  )

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>
}

export function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('useTabs must be used within TabsProvider')
  return ctx
}
