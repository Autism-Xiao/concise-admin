import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav'
import { ConfigDrawer } from '@/components/config-drawer'
import { FullscreenToggle } from '@/components/fullscreen-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeToggle } from '@/components/theme-toggle'
import { ReminderBell } from '@/features/system/calendar/components/reminder-bell'
import { MessageBell } from '@/features/system/message/components/message-bell'
import { TenantBadge } from '@/features/system/tenant/components/tenant-badge'

export function SiteHeader() {
  return (
    <header className="bg-background sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      {/* 当前租户角标放在最左侧图标区（折叠按钮旁）：租户是全局数据上下文，和导航起点同侧更好找 */}
      <TenantBadge />
      <Separator orientation="vertical" className="mx-1 h-4! self-center!" />
      <BreadcrumbNav />
      <div className="flex-1" />
      <Search />
      <FullscreenToggle />
      <ThemeToggle />
      <LanguageToggle />
      <ConfigDrawer />
      <ReminderBell />
      <MessageBell />
      <ProfileDropdown />
    </header>
  )
}
