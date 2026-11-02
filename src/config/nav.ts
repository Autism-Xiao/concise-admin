import type { LinkProps } from '@tanstack/react-router'
import { Bug, HelpCircle, LayoutDashboard, ListTodo, MessagesSquare, Package, Settings, Users, type LucideIcon } from 'lucide-react'

type RouteUrl = LinkProps['to'] | (string & {})

export type NavItem = {
  title: string
  icon: LucideIcon
  badge?: string
  url?: NavLinkUrl
  items?: { title: string; url: RouteUrl }[]
}

type NavLinkUrl = RouteUrl

export interface NavGroup {
  title: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    title: '通用',
    items: [
      { title: '仪表盘', url: '/dashboard', icon: LayoutDashboard },
      { title: '任务', url: '/tasks', icon: ListTodo },
      { title: '应用', url: '/apps', icon: Package },
      { title: '聊天', url: '/chats', icon: MessagesSquare, badge: '3' },
      { title: '用户', url: '/users', icon: Users }
    ]
  },
  {
    title: '页面',
    items: [
      {
        title: '错误页',
        icon: Bug,
        items: [
          { title: '401 未授权', url: '/errors/401' },
          { title: '403 禁止访问', url: '/errors/403' },
          { title: '404 不存在', url: '/errors/404' },
          { title: '500 服务器错误', url: '/errors/500' },
          { title: '503 维护中', url: '/errors/503' }
        ]
      }
    ]
  },
  {
    title: '其他',
    items: [
      { title: '设置', url: '/settings', icon: Settings },
      { title: '帮助中心', url: '/help-center', icon: HelpCircle }
    ]
  }
]
