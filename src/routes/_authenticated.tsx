import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SiteHeader } from '@/components/layout/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useSettings } from '@/context/settings-provider'
import { isAuthenticated } from '@/lib/auth'

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
  const collapsible = settings.layout === 'offcanvas' ? ('offcanvas' as const) : ('icon' as const)

  return (
    <SidebarProvider key={settings.layout} defaultOpen={settings.layout === 'default'}>
      <AppSidebar variant={settings.sidebarVariant} collapsible={collapsible} direction={settings.direction} />
      <SidebarInset className="h-svh overflow-hidden">
        <SiteHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
