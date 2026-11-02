import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SiteHeader } from '@/components/layout/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Watermark } from '@/components/watermark'
import { useSettings } from '@/context/settings-provider'
import { getUsername, isAuthenticated } from '@/lib/auth'
import { usePublicIp } from '@/lib/use-public-ip'

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
      <AppSidebar variant={settings.sidebarVariant} collapsible={collapsible} direction={settings.direction} />
      <SidebarInset className="h-svh overflow-hidden">
        <SiteHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
      {settings.watermark && watermarkContent.length > 0 && <Watermark content={watermarkContent} />}
    </SidebarProvider>
  )
}
