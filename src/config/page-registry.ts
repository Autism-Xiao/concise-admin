import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  BookOpen,
  Briefcase,
  Bug,
  Building2,
  CalendarDays,
  Database,
  Droplets,
  FolderOpen,
  HelpCircle,
  LayoutDashboard,
  ListTree,
  LogIn,
  Mail,
  MapPin,
  Medal,
  Megaphone,
  Keyboard,
  Monitor,
  Network,
  Palette,
  ScrollText,
  Server,
  Stamp,
  ShieldCheck,
  Timer,
  UserCheck,
  UserCog,
  Users,
  Wrench
} from 'lucide-react'
import type { TranslationKey } from '@/config/i18n'
import { DashboardPage } from '@/features/dashboard'
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
import { LevelPage } from '@/features/system/level'
import { PostPage } from '@/features/system/post'
import { TenantPage } from '@/features/system/tenant'
import { NoticePage } from '@/features/system/notice'
import { MessagePage } from '@/features/system/message'
import { SupplierPage } from '@/features/supplier'
import { RegionPage } from '@/features/system/region'
import { JobPage } from '@/features/ops/job'
import { OnlineUsersPage } from '@/features/ops/online'
import { ServerMonitorPage } from '@/features/ops/server'
import { CacheMonitorPage } from '@/features/ops/cache'
import { ForbiddenError, InternalServerError, MaintenanceError, NotFoundError, UnauthorizedError } from '@/features/errors'
import { ProfilePage } from '@/features/settings/profile'
import { AccountPage } from '@/features/settings/account'
import { AppearancePage } from '@/features/settings/appearance'
import { WatermarkSettingPage } from '@/features/settings/watermark'
import { NotificationsPage } from '@/features/settings/notifications'
import { DisplayPage } from '@/features/settings/display'
import { ShortcutsPage } from '@/features/settings/shortcuts'
import { MyWatermarkPage } from '@/features/settings/my-watermark'
import { CustomerPage } from '@/features/customer'

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
  '/system/customers': { component: CustomerPage, titleKey: 'nav.system.customer', icon: Briefcase },
  '/dashboard': { component: DashboardPage, titleKey: 'nav.dashboard', icon: LayoutDashboard },
  '/help-center': { component: HelpCenterPage, titleKey: 'nav.helpCenter', icon: HelpCircle },
  '/system/users': { component: UsersPage, titleKey: 'nav.system.users', icon: Users },
  '/system/menu': { component: MenuPage, titleKey: 'nav.system.menu', icon: ListTree },
  '/system/role': { component: RolePage, titleKey: 'nav.system.role', icon: ShieldCheck },
  '/system/dept': { component: DeptPage, titleKey: 'nav.system.dept', icon: Network },
  '/system/level': { component: LevelPage, titleKey: 'nav.system.level', icon: Medal },
  '/system/post': { component: PostPage, titleKey: 'nav.system.post', icon: Briefcase },
  '/system/tenant': { component: TenantPage, titleKey: 'nav.system.tenant', icon: Building2 },
  '/system/file': { component: FilePage, titleKey: 'nav.system.file', icon: FolderOpen },
  '/system/calendar': { component: CalendarPage, titleKey: 'nav.system.calendar', icon: CalendarDays },
  '/system/dict': { component: DictPage, titleKey: 'nav.system.dict', icon: BookOpen },
  '/system/notice': { component: NoticePage, titleKey: 'nav.system.notice', icon: Megaphone },
  '/system/message': { component: MessagePage, titleKey: 'nav.system.message', icon: Mail },
  '/system/suppliers': { component: SupplierPage, titleKey: 'nav.system.supplier', icon: Briefcase },
  '/system/region': { component: RegionPage, titleKey: 'nav.system.region', icon: MapPin },
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
  '/settings/watermark': { component: WatermarkSettingPage, label: '水印策略', icon: Droplets, settings: true },
  '/settings/notifications': { component: NotificationsPage, label: '通知', icon: Bell, settings: true },
  '/settings/display': { component: DisplayPage, label: '显示', icon: Monitor, settings: true },
  '/settings/shortcuts': { component: ShortcutsPage, label: '快捷键', icon: Keyboard, settings: true },
  '/settings/my-watermark': { component: MyWatermarkPage, label: '我的水印', icon: Stamp, settings: true }
}

export function isRegisteredPage(path: string): boolean {
  return path in PAGE_REGISTRY
}
