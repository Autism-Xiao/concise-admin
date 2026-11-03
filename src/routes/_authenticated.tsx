import { createFileRoute, Outlet, redirect, useLocation } from '@tanstack/react-router'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { PageTabs } from '@/components/layout/page-tabs'
import { SiteHeader } from '@/components/layout/site-header'
import { TabPageRenderer } from '@/components/layout/tab-page-renderer'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Watermark } from '@/components/watermark'
import { useSettings } from '@/context/settings-provider'
import { TabsProvider } from '@/context/tabs-provider'
import { isRegisteredPage } from '@/config/page-registry'
import { getUsername, isAuthenticated } from '@/lib/auth'
import { usePublicIp } from '@/lib/use-public-ip'
import type { WatermarkDensity } from '@/lib/settings'

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
  component: AuthenticatedLayout
})

function AuthenticatedLayout() {
  const { settings } = useSettings()
  const ip = usePublicIp()
  const collapsible = settings.layout === 'offcanvas' ? ('offcanvas' as const) : ('icon' as const)

  // 自定义内容支持 {username}、{ip} 占位符；留空则默认显示用户名 + IP 两行
  const username = getUsername()
  const watermarkContent = settings.watermarkContent.trim()
    ? settings.watermarkContent.replaceAll('{username}', username).replaceAll('{ip}', ip)
    : [username, ip].filter(Boolean)

  return (
    <SidebarProvider key={settings.layout} defaultOpen={settings.layout === 'default'}>
      <TabsProvider>
        <AppSidebar variant={settings.sidebarVariant} collapsible={collapsible} direction={settings.direction} />
        <SidebarInset className="h-svh overflow-hidden">
          <SiteHeader />
          <PageTabs />
          <main data-scroll="main" className="flex-1 overflow-y-auto p-6">
            <MainContent />
          </main>
        </SidebarInset>
      </TabsProvider>
      {settings.watermark && watermarkContent.length > 0 && <Watermark content={watermarkContent} tileSize={WATERMARK_TILE_SIZE[settings.watermarkDensity]} />}
    </SidebarProvider>
  )
}

// 单独订阅路由变化，避免导航时整个布局（侧边栏/头部）跟着重渲染；
// 已登记的页面走多标签页 keep-alive 渲染，未登记路径（如 404）回退到路由 Outlet
function MainContent() {
  const pathname = useLocation({ select: location => location.pathname })
  return isRegisteredPage(pathname) ? <TabPageRenderer /> : <Outlet />
}
