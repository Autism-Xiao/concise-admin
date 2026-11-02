import { Link } from '@tanstack/react-router'
import { ChevronRight, GalleryVerticalEnd } from 'lucide-react'
import { Collapsible } from 'radix-ui'
import {
  Sidebar,
  SidebarContent,
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
import { navGroups } from '@/config/nav'

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">{import.meta.env.VITE_APP_NAME}</span>
                  <span className="text-muted-foreground text-xs">v1.0.0</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map(group => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(item =>
                  item.items ? (
                    <Collapsible.Root key={item.title} className="group/collapsible">
                      <SidebarMenuItem>
                        <Collapsible.Trigger asChild>
                          <SidebarMenuButton>
                            <item.icon />
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </Collapsible.Trigger>
                        <Collapsible.Content>
                          <SidebarMenuSub>
                            {item.items.map(sub => (
                              <SidebarMenuSubItem key={sub.url}>
                                <SidebarMenuSubButton asChild>
                                  <Link to={sub.url} activeProps={{ 'data-active': true }}>
                                    {sub.title}
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </Collapsible.Content>
                      </SidebarMenuItem>
                    </Collapsible.Root>
                  ) : (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild>
                        <Link to={item.url!} activeProps={{ 'data-active': true }}>
                          <item.icon />
                          <span>{item.title}</span>
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
    </Sidebar>
  )
}
