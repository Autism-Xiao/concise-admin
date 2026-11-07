import { Outlet } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Bell, Droplets, Monitor, Palette, UserCog, Wrench } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { SidebarNav, type SettingsNavItem } from './components/sidebar-nav'
import { SettingsSyncBadge } from './components/settings-sync-badge'

const sidebarNavItems: SettingsNavItem[] = [
  { title: '个人资料', href: '/settings', icon: <UserCog size={18} /> },
  { title: '账户', href: '/settings/account', icon: <Wrench size={18} /> },
  { title: '外观', href: '/settings/appearance', icon: <Palette size={18} /> },
  { title: '通知', href: '/settings/notifications', icon: <Bell size={18} /> },
  { title: '显示', href: '/settings/display', icon: <Monitor size={18} /> },
  { title: '水印策略', href: '/settings/watermark', icon: <Droplets size={18} /> }
]

export function SettingsLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight">系统设置</h1>
          <p className="text-muted-foreground text-sm">管理账户信息与界面偏好设置</p>
        </div>
        <SettingsSyncBadge />
      </div>
      <Separator />
      <div className="flex flex-1 flex-col space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12">
        <aside className="top-0 lg:sticky lg:w-1/5">
          <SidebarNav items={sidebarNavItems} />
        </aside>
        {/* 多标签页 keep-alive 渲染时传入子页组件；常规路由渲染走 Outlet */}
        <div className="flex w-full p-1">{children ?? <Outlet />}</div>
      </div>
    </div>
  )
}
