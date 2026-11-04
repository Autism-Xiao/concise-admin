import { memo, useEffect, useState, type CSSProperties } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useTabs } from '@/context/tabs-provider'
import { isRegisteredPage, PAGE_REGISTRY } from '@/config/page-registry'
import { SettingsLayout } from '@/features/settings'

interface TabPageProps {
  path: string
  active: boolean
}

// memo 隔离：切换标签时只有「离开」和「进入」的两个页面重渲染，
// 其余已挂载页面不重复渲染，避免标签越多切换越卡
const TabPage = memo(function TabPage({ path, active }: TabPageProps) {
  const entry = PAGE_REGISTRY[path]
  if (!entry) return null
  const Comp = entry.component
  const style: CSSProperties = { display: active ? 'contents' : 'none' }
  return (
    <div style={style}>
      {entry.settings ? (
        <SettingsLayout>
          <Comp />
        </SettingsLayout>
      ) : (
        <Comp />
      )}
    </div>
  )
})

// 多标签页渲染器：首次只挂载当前页，访问过的标签再保持挂载（keep-alive）。
// 避免刷新时恢复的所有标签同时执行请求；非活动标签用 display:none 隐藏，
// 切换时保留滚动位置、表单和筛选状态；活动标签用 display:contents 保持原有布局。
export function TabPageRenderer() {
  const { tabs, nonces } = useTabs()
  const pathname = useLocation({ select: location => location.pathname })
  const [visitedPaths, setVisitedPaths] = useState<ReadonlySet<string>>(() => new Set([pathname]))

  useEffect(() => {
    if (!isRegisteredPage(pathname)) return
    setVisitedPaths(prev => {
      if (prev.has(pathname)) return prev
      const next = new Set(prev)
      next.add(pathname)
      return next
    })
  }, [pathname])

  const paths = tabs.map(t => t.path)
  // 路由刚切换、标签还没登记时先临时渲染当前页，避免闪烁
  if (!paths.includes(pathname) && isRegisteredPage(pathname)) paths.push(pathname)
  const mountedPaths = paths.filter(path => path === pathname || visitedPaths.has(path))

  return (
    <>
      {mountedPaths.map(path => (
        // nonce 变化 → key 变化 → 重挂载，实现「刷新当前页」
        <TabPage key={`${path}:${nonces[path] ?? 0}`} path={path} active={path === pathname} />
      ))}
    </>
  )
}
