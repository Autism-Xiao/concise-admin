import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronsUpDown, LogOut, Settings, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { useLocale } from '@/context/locale-provider'
import { AUTH_CHANGED_EVENT, getName, getUsername, logout } from '@/lib/auth'

export function NavUser() {
  const navigate = useNavigate()
  const { t } = useLocale()
  const { isMobile, setOpenMobile } = useSidebar()
  const username = getUsername()
  // 姓名改完（个人资料页）会广播 AUTH_CHANGED_EVENT，这里重新读一次 localStorage，
  // 否则要等整页刷新侧边栏才跟着变
  const [name, setName] = useState(getName)
  useEffect(() => {
    const sync = () => setName(getName())
    window.addEventListener(AUTH_CHANGED_EVENT, sync)
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync)
  }, [])

  // 移动端抽屉形态下，点击下拉项跳转后收起抽屉
  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg">
              <Avatar className="size-8">
                <AvatarFallback>{name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">{name}</span>
                <span className="text-muted-foreground text-xs">@{username}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" side="top" align="start" sideOffset={8}>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">{name}</p>
                <p className="text-muted-foreground text-xs">@{username}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => {
                  closeMobileSidebar()
                  void navigate({ to: '/settings' })
                }}
              >
                <User />
                {t('profile.profile')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  closeMobileSidebar()
                  void navigate({ to: '/settings' })
                }}
              >
                <Settings />
                {t('profile.settings')}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                closeMobileSidebar()
                logout()
                void navigate({ to: '/login' })
              }}
            >
              <LogOut />
              {t('profile.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
