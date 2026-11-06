import { useNavigate } from '@tanstack/react-router'
import { Lock, LogOut, Settings, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useLocale } from '@/context/locale-provider'
import { useLock } from '@/context/lock-provider'
import { useShortcuts } from '@/context/shortcut-provider'
import { getName, getUsername, logout } from '@/lib/auth'
import { SHORTCUT_DEFAULTS, displayCombo } from '@/lib/shortcuts'

export function ProfileDropdown() {
  const navigate = useNavigate()
  const { t } = useLocale()
  const { lock } = useLock()
  // 菜单里展示锁屏快捷键（跟随用户改绑后的设置，异常时回退默认值）
  const { shortcuts } = useShortcuts()
  const lockCombo = shortcuts.lockScreen || SHORTCUT_DEFAULTS.lockScreen

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative size-8 rounded-full">
          <Avatar className="size-8">
            <AvatarFallback>{getName().slice(0, 1)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">{getName()}</p>
            <p className="text-muted-foreground text-xs">@{getUsername()}</p>
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
          <DropdownMenuItem onClick={lock}>
            <Lock />
            {t('profile.lock')}
            <span className="text-muted-foreground ml-auto text-xs">{displayCombo(lockCombo)}</span>
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
  )
}
