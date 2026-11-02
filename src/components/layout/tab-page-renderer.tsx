import { useLocation } from '@tanstack/react-router'
import { useTabs } from '@/context/tabs-provider'
import { isRegisteredPage, PAGE_REGISTRY } from '@/config/page-registry'
import { SettingsLayout } from '@/features/settings'

// 多标签页渲染器：所有打开的标签页保持挂载（keep-alive），
// 非活动标签用 display:none 隐藏，切换时保留滚动位置、表单和筛选状态；
// 活动标签用 display:contents 保持原有布局表现
export function TabPageRenderer() {
  const { tabs, nonces } = useTabs()
  const pathname = useLocation({ select: location => location.pathname })

  const paths = tabs.map(t => t.path)
  // 路由刚切换、标签还没登记时先临时渲染当前页，避免闪烁
  if (!paths.includes(pathname) && isRegisteredPage(pathname)) paths.push(pathname)

  return (
    <>
      {paths.map(path => {
        const entry = PAGE_REGISTRY[path]
        if (!entry) return null
        const Comp = entry.component
        const active = path === pathname
        // nonce 变化 → key 变化 → 重挂载，实现「刷新当前页」
        const key = `${path}:${nonces[path] ?? 0}`
        return (
          <div key={key} style={{ display: active ? 'contents' : 'none' }}>
            {entry.settings ? (
              <SettingsLayout>
                <Comp />
              </SettingsLayout>
            ) : (
              <Comp />
            )}
          </div>
        )
      })}
    </>
  )
}
