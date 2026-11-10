import { Link } from '@tanstack/react-router'
import { Building2, Check, ChevronsUpDown, Globe, Loader2 } from 'lucide-react'
import { Logo } from '@/assets/logo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { useTenantScope } from '@/context/tenant-scope-provider'

const APP_VERSION = 'v1.0.0'

/**
 * 侧边栏顶部工作区：logo 位置即租户切换器
 *
 * - 可切换（多租户用户 / 超管）：logo 区域变成下拉触发器 —— 第一行显示当前租户名，
 *   第二行是应用名 + 版本；点开下拉直接选租户/平台视角，不用再开弹窗
 * - 不可切换（单租户普通用户）：渲染回原来的「logo + 应用名」链接，完全无感
 *
 * 数据与切换动作来自全局 TenantScopeProvider（单一状态源），头像菜单里的
 * 「切换租户」弹窗入口保留，两处切换后同步刷新。
 */
export function TenantWorkspace({ homePath }: { homePath: string }) {
  const { tenants, isSuper, current, currentLabel, switchable, switching, switchTo } = useTenantScope()
  const appName = import.meta.env.VITE_APP_NAME

  if (!switchable) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild>
            <Link to={homePath as never} className="group-data-[collapsible=icon]:justify-center">
              <Logo className="text-sidebar-primary size-8! shrink-0" />
              <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                <span className="font-medium">{appName}</span>
                <span className="text-muted-foreground text-xs">{APP_VERSION}</span>
              </div>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" tooltip="切换租户" className="data-[state=open]:bg-sidebar-accent">
              <Logo className="text-sidebar-primary size-8! shrink-0" />
              <div className="flex min-w-0 flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">{currentLabel}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {appName} · {APP_VERSION}
                </span>
              </div>
              {switching ? (
                <Loader2 className="ml-auto size-4 shrink-0 animate-spin opacity-60 group-data-[collapsible=icon]:hidden" />
              ) : (
                <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-60 group-data-[collapsible=icon]:hidden" />
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start" className="w-64">
            <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">切换租户</DropdownMenuLabel>
            {tenants.map(item => (
              <DropdownMenuItem
                key={item.id}
                disabled={!item.usable || item.id === current || switching}
                onClick={() => void switchTo(item.id)}
              >
                <Building2 className="shrink-0 opacity-60" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{item.name}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {item.code}
                    {item.usable ? (item.expireAt ? ` · 至 ${item.expireAt}` : ' · 永久') : ' · 已停用/到期'}
                  </div>
                </div>
                {item.id === current ? <Check className="text-primary shrink-0" /> : null}
              </DropdownMenuItem>
            ))}
            {isSuper ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={current === null || switching} onClick={() => void switchTo(0)}>
                  <Globe className="shrink-0 opacity-60" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">平台视角</div>
                    <div className="text-muted-foreground truncate text-xs">不做租户过滤，可看全部数据</div>
                  </div>
                  {current === null ? <Check className="text-primary shrink-0" /> : null}
                </DropdownMenuItem>
              </>
            ) : null}
            {switching ? (
              <div className="text-muted-foreground flex items-center justify-center gap-1.5 py-1 text-xs">
                <Loader2 className="size-3.5 animate-spin" />
                正在切换，页面数据即将刷新…
              </div>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
