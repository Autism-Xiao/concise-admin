import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ChevronRight, Search } from 'lucide-react'
import { Collapsible } from '@base-ui/react/collapsible'
import { Logo } from '@/assets/logo'
import { NavUser } from '@/components/layout/nav-user'
import { useSearch } from '@/context/search-provider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
  SidebarMenuSubItem,
  useSidebar
} from '@/components/ui/sidebar'
import { useLocale } from '@/context/locale-provider'
import { navGroups, type NavItem } from '@/config/nav'
import { cn } from '@/lib/utils'

import type { Direction, SidebarVariant } from '@/lib/settings'

interface AppSidebarProps {
  variant?: SidebarVariant
  collapsible?: 'icon' | 'offcanvas'
  direction?: Direction
}

export function AppSidebar({ variant = 'sidebar', collapsible = 'icon', direction = 'ltr' }: AppSidebarProps) {
  const { setOpen } = useSearch()
  const { t } = useLocale()
  const { state, isMobile } = useSidebar()
  const pathname = useLocation({ select: location => location.pathname })
  // 折叠成图标栏时，带二级菜单的项改为点击弹出浮层（移动端仍保持手风琴展开）
  const collapsed = state === 'collapsed' && !isMobile

  const isActive = (url?: string) => !!url && pathname === url

  return (
    <Sidebar collapsible={collapsible} variant={variant} side={direction === 'rtl' ? 'right' : 'left'}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard" className="group-data-[collapsible=icon]:justify-center">
                <Logo className="text-sidebar-primary size-8! shrink-0" />
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
                <SidebarMenuButton tooltip={t('nav.search')} onClick={() => setOpen(true)}>
                  <Search />
                  <span>{t('nav.search')}</span>
                  <SidebarMenuBadge>⌘J</SidebarMenuBadge>
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
                {group.items.map(item => {
                  if (!item.items) {
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild tooltip={t(item.titleKey)}>
                          <Link to={item.url!} activeProps={{ 'data-active': true }}>
                            <item.icon />
                            <span>{t(item.titleKey)}</span>
                            {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  }

                  const childActive = item.items.some(sub => isActive(sub.url))

                  // 折叠态：悬浮显示提示，点击图标弹出二级菜单浮层，点击子项跳转页面
                  if (collapsed) {
                    return (
                      <SidebarMenuItem key={item.titleKey}>
                        <CollapsedNavDropdown item={item} childActive={childActive} />
                      </SidebarMenuItem>
                    )
                  }

                  // 展开态：保持手风琴展开二级菜单
                  return (
                    <Collapsible.Root key={item.titleKey} className="group/collapsible" defaultOpen={childActive}>
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
                  )
                })}
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

// 折叠态下的带子菜单项：悬浮显示菜单名提示，点击弹出二级菜单浮层
function CollapsedNavDropdown({ item, childActive }: { item: NavItem; childActive: boolean }) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const pathname = useLocation({ select: location => location.pathname })
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <DropdownMenu onOpenChange={open => setMenuOpen(open)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton isActive={childActive}>
              <item.icon />
              <span>{t(item.titleKey)}</span>
              {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        {/* 浮层打开时隐藏提示，避免与菜单内容重叠 */}
        <TooltipContent side="right" align="center" hidden={menuOpen}>
          {t(item.titleKey)}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent side="right" align="start" sideOffset={4}>
        <DropdownMenuLabel>
          {t(item.titleKey)}
          {item.badge ? ` (${item.badge})` : ''}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {item.items!.map(sub => (
          <DropdownMenuItem
            key={sub.url}
            className={cn('cursor-pointer', pathname === sub.url && 'bg-accent text-accent-foreground')}
            onClick={() => void navigate({ to: sub.url })}
          >
            <span className="max-w-52 text-wrap">{t(sub.titleKey)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
