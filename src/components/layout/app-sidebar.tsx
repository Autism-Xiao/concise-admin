import { Link } from '@tanstack/react-router'
import { ChevronRight, Search } from 'lucide-react'
import { Collapsible } from '@base-ui/react/collapsible'
import { Logo } from '@/assets/logo'
import { NavUser } from '@/components/layout/nav-user'
import { useSearch } from '@/context/search-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar'
import { useLocale } from '@/context/locale-provider'
import { navGroups } from '@/config/nav'

import type { Direction, SidebarVariant } from '@/lib/settings'

interface AppSidebarProps {
  variant?: SidebarVariant
  collapsible?: 'icon' | 'offcanvas'
  direction?: Direction
}

export function AppSidebar({ variant = 'sidebar', collapsible = 'icon', direction = 'ltr' }: AppSidebarProps) {
  const { setOpen } = useSearch()
  const { t } = useLocale()

  return (
    <Sidebar collapsible={collapsible} variant={variant} side={direction === 'rtl' ? 'right' : 'left'}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <Logo className="text-sidebar-primary size-8 shrink-0" />
                <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                  <span className="font-medium">{import.meta.env.VITE_APP_NAME}</span>
                  <span className="text-muted-foreground text-xs">v1.0.0</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="pb-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpen(true)}>
                  <Search />
                  <span>{t('nav.search')}</span>
                  <SidebarMenuBadge>⌘K</SidebarMenuBadge>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {navGroups.map(group => (
          <SidebarGroup key={group.titleKey}>
            <SidebarGroupLabel>{t(group.titleKey)}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(item =>
                  item.items ? (
                    <Collapsible.Root key={item.titleKey} className="group/collapsible">
                      <SidebarMenuItem>
                        <Collapsible.Trigger
                          render={
                            <SidebarMenuButton>
                              <item.icon />
                              <span>{t(item.titleKey)}</span>
                              <ChevronRight className="ml-auto transition-transform group-data-open/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          }
                        />
                        <Collapsible.Panel className="CollapsibleContent">
                          <SidebarMenuSub>
                            {item.items.map(sub => (
                              <SidebarMenuSubItem key={sub.url}>
                                <SidebarMenuSubButton asChild>
                                  <Link to={sub.url} activeProps={{ 'data-active': true }}>
                                    {t(sub.titleKey)}
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </Collapsible.Panel>
                      </SidebarMenuItem>
                    </Collapsible.Root>
                  ) : (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild>
                        <Link to={item.url!} activeProps={{ 'data-active': true }}>
                          <item.icon />
                          <span>{t(item.titleKey)}</span>
                          {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
