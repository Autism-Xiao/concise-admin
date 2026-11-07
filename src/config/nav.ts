import type { LinkProps } from '@tanstack/react-router'
import {
  BookOpen,
  Briefcase,
  Bug,
  Building2,
  CalendarDays,
  Database,
  FolderOpen,
  HelpCircle,
  LayoutDashboard,
  ListTree,
  MapPin,
  Medal,
  Megaphone,
  Network,
  ScrollText,
  Server,
  Settings,
  ShieldCheck,
  Timer,
  UserCheck,
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
    items: [{ titleKey: 'nav.dashboard', url: '/dashboard', icon: LayoutDashboard }]
  },
  {
    titleKey: 'group.system',
    items: [
      { titleKey: 'nav.system.users', url: '/system/users', icon: Users },
      { titleKey: 'nav.system.menu', url: '/system/menu', icon: ListTree },
      { titleKey: 'nav.system.role', url: '/system/role', icon: ShieldCheck },
      { titleKey: 'nav.system.dept', url: '/system/dept', icon: Network },
      { titleKey: 'nav.system.level', url: '/system/level', icon: Medal },
      { titleKey: 'nav.system.post', url: '/system/post', icon: Briefcase },
      { titleKey: 'nav.system.tenant', url: '/system/tenant', icon: Building2 },
      { titleKey: 'nav.system.calendar', url: '/system/calendar', icon: CalendarDays },
      {
        titleKey: 'nav.system.log',
        icon: ScrollText,
        items: [
          { titleKey: 'nav.system.logLogin', url: '/system/log/login' },
          { titleKey: 'nav.system.logOperation', url: '/system/log/operation' }
        ]
      }
    ]
  },
  {
    titleKey: 'group.data',
    items: [
      { titleKey: 'nav.system.file', url: '/system/file', icon: FolderOpen },
      { titleKey: 'nav.system.dict', url: '/system/dict', icon: BookOpen },
      { titleKey: 'nav.system.notice', url: '/system/notice', icon: Megaphone },
      { titleKey: 'nav.system.region', url: '/system/region', icon: MapPin }
    ]
  },
  {
    titleKey: 'group.ops',
    items: [
      { titleKey: 'nav.ops.job', url: '/ops/job', icon: Timer },
      { titleKey: 'nav.ops.online', url: '/ops/online', icon: UserCheck },
      { titleKey: 'nav.ops.server', url: '/ops/server', icon: Server },
      { titleKey: 'nav.ops.cache', url: '/ops/cache', icon: Database }
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
