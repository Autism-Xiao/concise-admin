import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav'
import { ConfigDrawer } from '@/components/config-drawer'
import { FullscreenToggle } from '@/components/fullscreen-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeToggle } from '@/components/theme-toggle'

export function SiteHeader() {
  return (
    <header className="bg-background sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4! self-center!" />
      <BreadcrumbNav />
      <div className="flex-1" />
      <Search />
      <FullscreenToggle />
      <ThemeToggle />
      <LanguageToggle />
      <ConfigDrawer />
      <ProfileDropdown />
    </header>
  )
}
