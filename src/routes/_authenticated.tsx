import { createFileRoute, Navigate, Outlet, redirect, useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { PageTabs } from '@/components/layout/page-tabs'
import { SiteHeader } from '@/components/layout/site-header'
import { TabPageRenderer } from '@/components/layout/tab-page-renderer'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { ForceChangePasswordDialog } from '@/components/forced-change-password-dialog'
import { ServiceStatusBanner } from '@/components/service-status-banner'
import { Watermark } from '@/components/watermark'
import { TabsProvider } from '@/context/tabs-provider'
import { WatermarkProvider, useWatermark } from '@/context/watermark-provider'
import { LockProvider } from '@/context/lock-provider'
import { useSettings } from '@/context/settings-provider'
import { isRegisteredPage } from '@/config/page-registry'
import { NoMenuAccess } from '@/features/errors'
import { isAuthenticated, needsPasswordChange } from '@/lib/auth'
import { isPathAllowed, usePermittedPaths } from '@/lib/permissions'
import type { WatermarkDensity } from '@/lib/watermark'

// 水印密度 → 单个平铺区块尺寸，区块越小水印越密
const WATERMARK_TILE_SIZE: Record<WatermarkDensity, [number, number]> = {
  compact: [200, 110],
  default: [250, 140],
  loose: [340, 200]
}

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
  // 水印 Provider 挂在布局外层：登出/切号时随布局卸载，不会闪现上一个人的水印
  // 锁屏 Provider 同理挂在布局外层：锁定时遮罩覆盖整个工作区（含水印之上）
  component: () => (
    <WatermarkProvider>
      <LockProvider>
        <AuthenticatedLayout />
      </LockProvider>
    </WatermarkProvider>
  )
})

function AuthenticatedLayout() {
  const { settings } = useSettings()
  const wm = useWatermark()
  const collapsible = settings.layout === 'offcanvas' ? ('offcanvas' as const) : ('icon' as const)
  const density = (wm.config?.density ?? 'default') as WatermarkDensity

  return (
    <SidebarProvider key={settings.layout} defaultOpen={settings.layout === 'default'}>
      {/* 密码过期/管理员标记强制改密：盖在所有内容之上，改完才放行（存 sessionStorage，刷新不丢） */}
      {needsPasswordChange() && <ForceChangePasswordDialog />}
      <TabsProvider>
        <AppSidebar variant={settings.sidebarVariant} collapsible={collapsible} direction={settings.direction} />
        <SidebarInset className="h-svh overflow-hidden">
          <SiteHeader />
          {/* 后端整体不可用时只留一条常驻横幅，避免每个接口各弹一条 toast */}
          <ServiceStatusBanner />
          <PageTabs />
          <main data-scroll="main" className="flex-1 overflow-y-auto p-6">
            <PermissionGuard>
              <MainContent />
            </PermissionGuard>
          </main>
        </SidebarInset>
      </TabsProvider>
      {/* 水印完全由后端下发：开关、内容、样式都来自 /users/me/watermark，前端只负责绘制 */}
      {wm.config?.enabled && wm.config.lines.length > 0 && (
        <Watermark
          content={wm.config.lines}
          opacity={wm.config.opacity / 100}
          rotate={wm.config.rotate}
          fontSize={wm.config.fontSize}
          tileSize={WATERMARK_TILE_SIZE[density] ?? WATERMARK_TILE_SIZE.default}
        />
      )}
    </SidebarProvider>
  )
}

// 单独订阅路由变化，避免导航时整个布局（侧边栏/头部）跟着重渲染；
// 已登记的页面走多标签页 keep-alive 渲染，未登记路径（如 404）回退到路由 Outlet
function MainContent() {
  const pathname = useLocation({ select: location => location.pathname })
  return isRegisteredPage(pathname) ? <TabPageRenderer /> : <Outlet />
}

// 路由级权限拦截：直接输入无权限的 URL 时跳 403；
// 超级管理员 / 权限加载中 / 加载失败（permitted 为 null）一律放行
function PermissionGuard({ children }: { children: ReactNode }) {
  const pathname = useLocation({ select: location => location.pathname })
  const permitted = usePermittedPaths()
  // 退出登录的瞬间布局还挂在树上，此时 pathname 已变成 /login：
  // 若继续按权限把它跳到 /errors/403，而 403 又要求登录、会被 login 的守卫踢回 /login，
  // 两者互相重定向形成死循环，表现为点「退出登录」后卡住退不出去。未登录时直接不渲染。
  if (!isAuthenticated()) return null
  if (!permitted || isPathAllowed(pathname, permitted)) return children
  // 一个业务菜单都没授权：给明确提示 + 退出入口，而不是甩 403 让人以为链接坏了
  // （首页 /dashboard 在白名单里，会走上面的放行分支，并自带「未分配菜单」提示条）
  if (permitted.size === 0) return <NoMenuAccess />
  return <Navigate to="/errors/403" replace />
}
