import { LayoutDashboard, Settings, Users, type LucideIcon } from 'lucide-react'

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
}

export const navMain: NavItem[] = [
  { title: '仪表盘', url: '/dashboard', icon: LayoutDashboard },
  { title: '用户管理', url: '/users', icon: Users },
  { title: '系统设置', url: '/settings', icon: Settings }
]
