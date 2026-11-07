import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { ChevronRight, Circle, LayoutDashboard, Search, type LucideIcon } from 'lucide-react'
import { Collapsible } from '@base-ui/react/collapsible'
import { Logo } from '@/assets/logo'
import { NavUser } from '@/components/layout/nav-user'
import { useSearch } from '@/context/search-provider'
import { useShortcutAction } from '@/context/shortcut-provider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar
} from '@/components/ui/sidebar'
import { useLocale } from '@/context/locale-provider'
import { navGroups, type NavGroup, type NavItem } from '@/config/nav'
import { HOME_PATH, PAGE_REGISTRY } from '@/config/page-registry'
import { menuPath, useMenuTree, usePermittedPaths } from '@/lib/permissions'
import { resolveHomePath } from '@/lib/home-path'
import type { PermissionMenu } from '@/features/auth/api'
import { cn } from '@/lib/utils'

import type { Direction, SidebarVariant } from '@/lib/settings'

interface AppSidebarProps {
  variant?: SidebarVariant
  collapsible?: 'icon' | 'offcanvas'
  direction?: Direction
}

/* ---------- 后端菜单树 → 侧边栏分组 ---------- */

interface DynItem {
  /** 叶子菜单的路由地址；目录节点（带子菜单）没有 url，仅作为折叠容器 */
  url?: string
  label: string
  icon: LucideIcon
  /** 子菜单（最多再嵌一层：目录 > 子目录 > 页面） */
  children?: DynItem[]
}

interface DynGroup {
  key: string
  /** 空字符串表示无分组标题（顶层独立菜单） */
  label: string
  items: DynItem[]
}

function menuIcon(path?: string): LucideIcon {
  return (path && PAGE_REGISTRY[path]?.icon) || Circle
}

/**
 * 菜单节点是否渲染到侧边栏。
 * 仪表盘和其他菜单一样走后端菜单树（排序、分组、改名都由「菜单管理」决定），
 * 不再有硬编码的顶部固定入口 —— 后端登录接口会把首页节点补进树里，任何角色都有。
 */
const visible = (n: PermissionMenu) => n.menuType !== 2 && n.hidden !== 1 && n.status !== '0'
const nodeLabel = (n: PermissionMenu) => n.name ?? n.title ?? ''
const bySort = (a: PermissionMenu, b: PermissionMenu) => (a.sortNo ?? a.sort ?? 0) - (b.sortNo ?? b.sort ?? 0)

/**
 * 菜单节点 → DynItem：
 * - 有可见子菜单 → 目录项（无 url，渲染为可折叠子菜单）
 * - 无子菜单但有路由 → 叶子链接
 * - 既无子菜单又无路由（或只有按钮子级）→ 丢弃
 */
function toDynItem(node: PermissionMenu): DynItem | null {
  const children = (node.children ?? [])
    .filter(visible)
    .sort(bySort)
    .map(toDynItem)
    .filter((x): x is DynItem => x != null)
  const label = nodeLabel(node)
  if (children.length > 0) return { label, icon: menuIcon(menuPath(node)), children }
  const url = menuPath(node)
  return url ? { url, label: label || url, icon: menuIcon(url) } : null
}

/**
 * menuType 0（目录）带 children → 侧边栏分组；menuType 1 → 组内菜单项，
 * 组内支持二级折叠（如 系统管理 > 日志管理 > 登录日志/操作日志）；
 * menuType 2（按钮权限）、hidden=1、status='0'（停用）不显示；顶层无子级但有路由的收进无标题分组。
 * 字段兼容真实后端（name/url/sortNo）与旧字段（title/path/sort）。
 */
function treeToGroups(tree: PermissionMenu[]): DynGroup[] {
  const groups: DynGroup[] = []
  const loose: DynItem[] = []
  for (const node of [...tree].sort(bySort)) {
    if (!visible(node)) continue
    const children = (node.children ?? [])
      .filter(visible)
      .sort(bySort)
      .map(toDynItem)
      .filter((x): x is DynItem => x != null)
    if (children.length > 0) {
      groups.push({ key: String(node.id), label: nodeLabel(node), items: children })
    } else {
      const item = toDynItem({ ...node, children: [] })
      if (item) loose.push(item)
    }
  }
  if (loose.length) groups.unshift({ key: '_loose', label: '', items: loose })
  return groups
}

export function AppSidebar({ variant = 'sidebar', collapsible = 'icon', direction = 'ltr' }: AppSidebarProps) {
  const { setOpen } = useSearch()
  const { t } = useLocale()
  const { state, isMobile, setOpenMobile, toggleSidebar } = useSidebar()
  const pathname = useLocation({ select: location => location.pathname })
  // 侧边栏折叠快捷键（默认 Ctrl+B，可在偏好设置改绑）：sidebar.tsx 不再自带监听
  useShortcutAction('toggleSidebar', () => toggleSidebar())
  // 折叠成图标栏时，带二级菜单的项改为点击弹出浮层（移动端仍保持手风琴展开）
  const collapsed = state === 'collapsed' && !isMobile

  const isActive = (url?: string) => !!url && pathname === url

  // 移动端（抽屉形态）点击导航后自动收起抽屉，桌面端无影响
  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false)
  }

  // 按当前角色的菜单权限过滤侧边栏（仅过滤业务分组，页面/其他分组始终显示）
  const permitted = usePermittedPaths()
  // Logo 回首页同样跟随权限，避免点了 Logo 反而被甩到 403
  const homePath = resolveHomePath()
  const visibleGroups = useMemo<NavGroup[]>(() => {
    if (!permitted) return navGroups
    // 首页是常驻页面（路由守卫白名单放行），不参与菜单授权过滤
    const allowed = (url?: string) => !!url && (url === HOME_PATH || permitted.has(url))
    return navGroups
      .map(group => {
        if (group.titleKey !== 'group.general' && group.titleKey !== 'group.system' && group.titleKey !== 'group.data' && group.titleKey !== 'group.ops')
          return group
        const items = group.items
          .map(item => {
            if (!item.items) return allowed(item.url as string) ? item : null
            const subs = item.items.filter(sub => allowed(sub.url as string))
            return subs.length ? { ...item, items: subs } : null
          })
          .filter((item): item is NavItem => item != null)
        return { ...group, items }
      })
      .filter(group => group.items.length > 0)
  }, [permitted])

  // 登录后拿到后端菜单树则直接用它渲染（后端已按角色过滤）；否则回退静态菜单
  const menuTree = useMenuTree()
  const dynamicGroups = useMemo<DynGroup[] | null>(() => {
    if (!menuTree) return null
    const groups = treeToGroups(menuTree)
    // 兜底：历史会话缓存里没有首页节点（后端补节点前登录的账号）时补一个，
    // 保证「登录 → 落地页」始终有可点的入口；后端下发了则以菜单配置的排序/名称为准
    const hasHome = groups.some(g => g.items.some(i => i.url === HOME_PATH || i.children?.some(c => c.url === HOME_PATH)))
    if (hasHome) return groups
    return [
      {
        key: '_home',
        label: '',
        items: [{ url: HOME_PATH, label: t('nav.dashboard'), icon: LayoutDashboard }]
      },
      ...groups
    ]
  }, [menuTree, t])

  return (
    <Sidebar collapsible={collapsible} variant={variant} side={direction === 'rtl' ? 'right' : 'left'}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to={homePath as never} className="group-data-[collapsible=icon]:justify-center" onClick={closeMobileSidebar}>
                <Logo className="text-sidebar-primary size-8! shrink-0" />
                <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                  <span className="font-medium">{import.meta.env.VITE_APP_NAME}</span>
                  <span className="text-muted-foreground text-xs">v1.0.0</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="pb-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {/* 搜索是动作不是路由，固定放在菜单最上方；页面入口（含仪表盘）全部由菜单树渲染 */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={t('nav.search')}
                  onClick={() => {
                    closeMobileSidebar()
                    setOpen(true)
                  }}
                >
                  <Search />
                  <span>{t('nav.search')}</span>
                  <SidebarMenuBadge>⌘J</SidebarMenuBadge>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* 后端菜单树模式：menuType 0 → 分组，menuType 1 → 组内菜单项（支持二级折叠） */}
        {dynamicGroups?.map(group => (
          <SidebarGroup key={group.key}>
            {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(item => {
                  // 目录项（如 日志管理）：手风琴展开子菜单
                  if (item.children?.length) {
                    const childActive =
                      item.children.some(sub => sub.url === pathname) || item.children.some(sub => sub.children?.some(d => d.url === pathname))
                    return (
                      <Collapsible.Root key={item.label} className="group/collapsible" defaultOpen={childActive}>
                        <SidebarMenuItem>
                          <Collapsible.Trigger
                            render={
                              <SidebarMenuButton tooltip={item.label}>
                                <item.icon />
                                <span>{item.label}</span>
                                <ChevronRight className="ml-auto transition-transform group-data-open/collapsible:rotate-90" />
                              </SidebarMenuButton>
                            }
                          />
                          <Collapsible.Panel className="CollapsibleContent">
                            <SidebarMenuSub>
                              {item.children.map(sub =>
                                sub.children?.length ? (
                                  sub.children.map(d =>
                                    d.url ? (
                                      <SidebarMenuSubItem key={d.url}>
                                        <SidebarMenuSubButton asChild>
                                          <Link to={d.url} activeProps={{ 'data-active': true }} onClick={closeMobileSidebar}>
                                            {d.label}
                                          </Link>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    )
                                    : null
                                  )
                                ) : (
                                  <SidebarMenuSubItem key={sub.url}>
                                    <SidebarMenuSubButton asChild>
                                      <Link to={sub.url} activeProps={{ 'data-active': true }} onClick={closeMobileSidebar}>
                                        {sub.label}
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                )
                              )}
                            </SidebarMenuSub>
                          </Collapsible.Panel>
                        </SidebarMenuItem>
                      </Collapsible.Root>
                    )
                  }
                  // 叶子菜单：普通链接
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild tooltip={item.label}>
                        <Link to={item.url} activeProps={{ 'data-active': true }} onClick={closeMobileSidebar}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {!dynamicGroups &&
          visibleGroups.map(group => (
            <SidebarGroup key={group.titleKey}>
              <SidebarGroupLabel>{t(group.titleKey)}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map(item => {
                    if (!item.items) {
                      return (
                        <SidebarMenuItem key={item.url}>
                          <SidebarMenuButton asChild tooltip={t(item.titleKey)}>
                            <Link to={item.url!} activeProps={{ 'data-active': true }} onClick={closeMobileSidebar}>
                              <item.icon />
                              <span>{t(item.titleKey)}</span>
                              {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    }

                    const childActive = item.items.some(sub => isActive(sub.url))

                    // 折叠态：悬浮显示提示，点击图标弹出二级菜单浮层，点击子项跳转页面
                    if (collapsed) {
                      return (
                        <SidebarMenuItem key={item.titleKey}>
                          <CollapsedNavDropdown item={item} childActive={childActive} />
                        </SidebarMenuItem>
                      )
                    }

                    // 展开态：保持手风琴展开二级菜单
                    return (
                      <Collapsible.Root key={item.titleKey} className="group/collapsible" defaultOpen={childActive}>
                        <SidebarMenuItem>
                          <Collapsible.Trigger
                            render={
                              <SidebarMenuButton>
                                <item.icon />
                                <span>{t(item.titleKey)}</span>
                                <ChevronRight className="ml-auto transition-transform group-data-open/collapsible:rotate-90" />
                              </SidebarMenuButton>
                            }
                          />
                          <Collapsible.Panel className="CollapsibleContent">
                            <SidebarMenuSub>
                              {item.items.map(sub => (
                                <SidebarMenuSubItem key={sub.url}>
                                  <SidebarMenuSubButton asChild>
                                    <Link to={sub.url} activeProps={{ 'data-active': true }} onClick={closeMobileSidebar}>
                                      {t(sub.titleKey)}
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </Collapsible.Panel>
                        </SidebarMenuItem>
                      </Collapsible.Root>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}

// 折叠态下的带子菜单项：悬浮显示菜单名提示，点击弹出二级菜单浮层
function CollapsedNavDropdown({ item, childActive }: { item: NavItem; childActive: boolean }) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const pathname = useLocation({ select: location => location.pathname })
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <DropdownMenu onOpenChange={open => setMenuOpen(open)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton isActive={childActive}>
              <item.icon />
              <span>{t(item.titleKey)}</span>
              {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        {/* 浮层打开时隐藏提示，避免与菜单内容重叠 */}
        <TooltipContent side="right" align="center" hidden={menuOpen}>
          {t(item.titleKey)}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent side="right" align="start" sideOffset={4}>
        <DropdownMenuLabel>
          {t(item.titleKey)}
          {item.badge ? ` (${item.badge})` : ''}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {item.items!.map(sub => (
          <DropdownMenuItem
            key={sub.url}
            className={cn('cursor-pointer', pathname === sub.url && 'bg-accent text-accent-foreground')}
            onClick={() => void navigate({ to: sub.url })}
          >
            <span className="max-w-52 text-wrap">{t(sub.titleKey)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
