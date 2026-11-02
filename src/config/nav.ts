import type { LinkProps } from '@tanstack/react-router'
import {
  Bug,
  HelpCircle,
  LayoutDashboard,
  ListTodo,
  MessagesSquare,
  Package,
  Settings,
  Users,
  type LucideIcon
} from 'lucide-react'
import type { TranslationKey } from '@/config/i18n'

type RouteUrl = LinkProps['to'] | (string & {})

export type NavItem = {
  titleKey: TranslationKey
  icon: LucideIcon
  badge?: string
  url?: RouteUrl
  items?: { titleKey: TranslationKey; url: RouteUrl }[]
}

export interface NavGroup {
  titleKey: TranslationKey
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    titleKey: 'group.general',
    items: [
      { titleKey: 'nav.dashboard', url: '/dashboard', icon: LayoutDashboard },
      { titleKey: 'nav.tasks', url: '/tasks', icon: ListTodo },
      { titleKey: 'nav.apps', url: '/apps', icon: Package },
      { titleKey: 'nav.chats', url: '/chats', icon: MessagesSquare, badge: '3' },
      { titleKey: 'nav.users', url: '/users', icon: Users }
    ]
  },
  {
    titleKey: 'group.pages',
    items: [
      {
        titleKey: 'nav.errors',
        icon: Bug,
        items: [
          { titleKey: 'nav.errors.401', url: '/errors/401' },
          { titleKey: 'nav.errors.403', url: '/errors/403' },
          { titleKey: 'nav.errors.404', url: '/errors/404' },
          { titleKey: 'nav.errors.500', url: '/errors/500' },
          { titleKey: 'nav.errors.503', url: '/errors/503' }
        ]
      }
    ]
  },
  {
    titleKey: 'group.other',
    items: [
      { titleKey: 'nav.settings', url: '/settings', icon: Settings },
      { titleKey: 'nav.helpCenter', url: '/help-center', icon: HelpCircle }
    ]
  }
]
