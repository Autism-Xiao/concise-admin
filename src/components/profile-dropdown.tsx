import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Check, LogOut, Settings, ShieldCheck, User } from 'lucide-react'
import { toast } from 'sonner'
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
import { getRoleCode, logout, setRoleCode } from '@/lib/auth'
import { notifyPermissionsChanged } from '@/lib/permissions'
import type { Role } from '@/features/system/role/api'

export function ProfileDropdown() {
  const navigate = useNavigate()
  const { t } = useLocale()
  const [roles, setRoles] = useState<Role[]>([])
  const [roleCode, setCurrentRole] = useState(getRoleCode())

  useEffect(() => {
    fetch('/mock/roles.json')
      .then(r => r.json() as Promise<Role[]>)
      .then(setRoles)
      .catch(() => {
        // 角色列表加载失败时不展示切换项
      })
  }, [])

  const switchRole = (role: Role) => {
    setRoleCode(role.code)
    setCurrentRole(role.code)
    notifyPermissionsChanged()
    toast.success(`已切换为角色「${role.name}」，侧边栏按权限重新过滤`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative size-8 rounded-full">
          <Avatar className="size-8">
            <AvatarFallback>张</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">张三</p>
            <p className="text-muted-foreground text-xs">zhangsan@example.com</p>
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
        <DropdownMenuLabel className="text-muted-foreground flex items-center gap-2 text-xs font-normal">
          <ShieldCheck className="size-3.5" />
          切换角色（演示权限过滤）
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {roles
            .filter(r => r.status === '正常')
            .map(role => (
              <DropdownMenuItem key={role.code} onClick={() => switchRole(role)}>
                <Check className={`size-4 ${roleCode === role.code ? 'opacity-100' : 'opacity-0'}`} />
                {role.name}
              </DropdownMenuItem>
            ))}
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
