import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  BookOpen,
  Bug,
  CalendarDays,
  Database,
  FolderOpen,
  HelpCircle,
  LayoutDashboard,
  ListTodo,
  ListTree,
  LogIn,
  MessagesSquare,
  Monitor,
  Network,
  Package,
  Palette,
  ScrollText,
  Server,
  ShieldCheck,
  Timer,
  UserCheck,
  UserCog,
  Users,
  Wrench
} from 'lucide-react'
import type { TranslationKey } from '@/config/i18n'
import { DashboardPage } from '@/features/dashboard'
import { TasksPage } from '@/features/tasks'
import { AppsPage } from '@/features/apps'
import { ChatsPage } from '@/features/chats'
import { HelpCenterPage } from '@/features/help-center'
import { UsersPage } from '@/features/users'
import { MenuPage } from '@/features/system/menu'
import { RolePage } from '@/features/system/role'
import { DeptPage } from '@/features/system/dept'
import { FilePage } from '@/features/system/file'
import { CalendarPage } from '@/features/system/calendar'
import { DictPage } from '@/features/system/dict'
import { LoginLogPage } from '@/features/system/log/login'
import { OperationLogPage } from '@/features/system/log/operation'
import { JobPage } from '@/features/ops/job'
import { OnlineUsersPage } from '@/features/ops/online'
import { ServerMonitorPage } from '@/features/ops/server'
import { CacheMonitorPage } from '@/features/ops/cache'
import { ForbiddenError, InternalServerError, MaintenanceError, NotFoundError, UnauthorizedError } from '@/features/errors'
import { ProfilePage } from '@/features/settings/profile'
import { AccountPage } from '@/features/settings/account'
import { AppearancePage } from '@/features/settings/appearance'
import { NotificationsPage } from '@/features/settings/notifications'
import { DisplayPage } from '@/features/settings/display'

// 页签栏/页面渲染共用的路由登记表：path → 页面组件 + 标题 + 图标
// 注意：这里的组件绕过了路由 Outlet 直接渲染，新增页面时需要在此登记
export interface PageEntry {
  component: ComponentType
  /** 走 i18n 的标题 key（导航项） */
  titleKey?: TranslationKey
  /** 固定中文标题（设置子页，与设置中心子导航一致） */
  label?: string
  icon: LucideIcon
  /** 为 true 时页面渲染在设置中心布局内（左侧带子导航） */
  settings?: boolean
}

export const HOME_PATH = '/dashboard'

export const PAGE_REGISTRY: Record<string, PageEntry> = {
  '/dashboard': { component: DashboardPage, titleKey: 'nav.dashboard', icon: LayoutDashboard },
  '/tasks': { component: TasksPage, titleKey: 'nav.tasks', icon: ListTodo },
  '/apps': { component: AppsPage, titleKey: 'nav.apps', icon: Package },
  '/chats': { component: ChatsPage, titleKey: 'nav.chats', icon: MessagesSquare },
  '/help-center': { component: HelpCenterPage, titleKey: 'nav.helpCenter', icon: HelpCircle },
  '/system/users': { component: UsersPage, titleKey: 'nav.system.users', icon: Users },
  '/system/menu': { component: MenuPage, titleKey: 'nav.system.menu', icon: ListTree },
  '/system/role': { component: RolePage, titleKey: 'nav.system.role', icon: ShieldCheck },
  '/system/dept': { component: DeptPage, titleKey: 'nav.system.dept', icon: Network },
  '/system/file': { component: FilePage, titleKey: 'nav.system.file', icon: FolderOpen },
  '/system/calendar': { component: CalendarPage, titleKey: 'nav.system.calendar', icon: CalendarDays },
  '/system/dict': { component: DictPage, titleKey: 'nav.system.dict', icon: BookOpen },
  '/system/log/login': { component: LoginLogPage, titleKey: 'nav.system.logLogin', icon: LogIn },
  '/system/log/operation': { component: OperationLogPage, titleKey: 'nav.system.logOperation', icon: ScrollText },
  '/ops/job': { component: JobPage, titleKey: 'nav.ops.job', icon: Timer },
  '/ops/online': { component: OnlineUsersPage, titleKey: 'nav.ops.online', icon: UserCheck },
  '/ops/server': { component: ServerMonitorPage, titleKey: 'nav.ops.server', icon: Server },
  '/ops/cache': { component: CacheMonitorPage, titleKey: 'nav.ops.cache', icon: Database },
  '/errors/401': { component: UnauthorizedError, titleKey: 'nav.errors.401', icon: Bug },
  '/errors/403': { component: ForbiddenError, titleKey: 'nav.errors.403', icon: Bug },
  '/errors/404': { component: NotFoundError, titleKey: 'nav.errors.404', icon: Bug },
  '/errors/500': { component: InternalServerError, titleKey: 'nav.errors.500', icon: Bug },
  '/errors/503': { component: MaintenanceError, titleKey: 'nav.errors.503', icon: Bug },
  '/settings': { component: ProfilePage, label: '个人资料', icon: UserCog, settings: true },
  '/settings/account': { component: AccountPage, label: '账户', icon: Wrench, settings: true },
  '/settings/appearance': { component: AppearancePage, label: '外观', icon: Palette, settings: true },
  '/settings/notifications': { component: NotificationsPage, label: '通知', icon: Bell, settings: true },
  '/settings/display': { component: DisplayPage, label: '显示', icon: Monitor, settings: true }
}

export function isRegisteredPage(path: string): boolean {
  return path in PAGE_REGISTRY
}
