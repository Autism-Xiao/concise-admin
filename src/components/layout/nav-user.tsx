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
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { useLocale } from '@/context/locale-provider'
import { getName, getUsername, logout } from '@/lib/auth'

export function NavUser() {
  const navigate = useNavigate()
  const { t } = useLocale()
  const name = getName()
  const username = getUsername()

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
              <DropdownMenuItem onClick={() => void navigate({ to: '/settings' })}>
                <User />
                {t('profile.profile')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void navigate({ to: '/settings' })}>
                <Settings />
                {t('profile.settings')}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
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
