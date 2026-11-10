import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Lock, LogOut, Settings, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { AUTH_CHANGED_EVENT, getAvatar, getName, getUsername, logout, resolveAvatarUrl } from '@/lib/auth'
import { SHORTCUT_DEFAULTS, displayCombo } from '@/lib/shortcuts'

export function ProfileDropdown() {
  const navigate = useNavigate()
  const { t } = useLocale()
  const { lock } = useLock()
  // 菜单里展示锁屏快捷键（跟随用户改绑后的设置，异常时回退默认值）
  const { shortcuts } = useShortcuts()
  const lockCombo = shortcuts.lockScreen || SHORTCUT_DEFAULTS.lockScreen
  // 姓名/头像读本地缓存；个人资料页改完会广播 AUTH_CHANGED_EVENT，这里跟着重新读，
  // 否则要等整页刷新顶栏头像才变
  const [name, setName] = useState(getName)
  const [avatar, setAvatarPath] = useState(getAvatar)
  useEffect(() => {
    const sync = () => {
      setName(getName())
      setAvatarPath(getAvatar())
    }
    window.addEventListener(AUTH_CHANGED_EVENT, sync)
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync)
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative size-8 rounded-full">
          <Avatar className="size-8">
            <AvatarImage src={resolveAvatarUrl(avatar)} alt={name} />
            <AvatarFallback>{name.slice(0, 1)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">{name}</p>
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
