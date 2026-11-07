import { useEffect, useState } from 'react'
import { getMenuTree, getPermissions } from '@/lib/auth'
import type { PermissionMenu } from '@/features/auth/api'

const listeners = new Set<() => void>()

/** 统一取菜单节点的路由地址，顺带把后端与前端路由不一致的地址映射到前端实际路由。 */
export const MENU_URL_ALIAS: Record<string, string> = {
  '/system/user': '/system/users',
  '/system/task': '/tasks',
  '/tools/storage': '/system/file'
}

export function menuPath(item: Pick<PermissionMenu, 'url' | 'path'>): string | undefined {
  const raw = item.url ?? item.path ?? undefined
  if (!raw) return undefined
  return MENU_URL_ALIAS[raw] ?? raw
}

/** 角色权限或当前角色变化后调用，侧边栏等订阅方会重新计算可见菜单 */
export function notifyPermissionsChanged(): void {
  listeners.forEach(l => l())
}

/** 从后端返回的菜单树收集可见路径（排除按钮节点、隐藏与停用路由） */
function collectPaths(items: PermissionMenu[], out: Set<string>): void {
  for (const item of items) {
    const url = menuPath(item)
    if (item.menuType !== 2 && item.hidden !== 1 && item.status !== '0' && url) {
      out.add(url)
    }
    if (item.children?.length) collectPaths(item.children, out)
  }
}

/**
 * 当前角色可见的菜单路径集合。
 * 返回 null 表示不做过滤（超级管理员 / 加载中），避免闪烁。
 *
 * 数据只认后端：
 * - 有菜单数组（哪怕是空数组）→ 以它为准。空数组代表「一个菜单都没授权」，必须过滤到空。
 * - 从未写入过菜单数据（null）→ 同样视为无任何可见菜单，不再回退本地 mock。
 */
export function computePermittedPaths(): Set<string> | null {
  // 超管判定只认后端下发的 '*'（ROLE_KEY 由前端存储，可被篡改，不能作为放行依据）
  if (getPermissions().includes('*')) return null
  const tree = getMenuTree<PermissionMenu[]>()
  if (!tree) return new Set<string>()
  const paths = new Set<string>()
  collectPaths(tree, paths)
  return paths
}

export function usePermittedPaths(): Set<string> | null {
  const [paths, setPaths] = useState<Set<string> | null>(null)

  useEffect(() => {
    let alive = true
    const reload = () => {
      try {
        const next = computePermittedPaths()
        if (alive) setPaths(next)
      } catch {
        // 解析失败时保持不过滤，避免侧边栏闪烁
      }
    }
    reload()
    listeners.add(reload)
    return () => {
      alive = false
      listeners.delete(reload)
    }
  }, [])

  return paths
}

/** 内置超级管理员角色编码：后端对这两个 code 直接放通全部菜单与按钮，不读角色授权表 */
export const SUPER_ROLE_CODES = ['admin', 'superadmin']

/** 判断角色编码是否为内置超管（授权对其无效，UI 需禁用分配入口） */
export function isSuperRoleCode(code?: string | null): boolean {
  return !!code && SUPER_ROLE_CODES.includes(code)
}

/** 响应式读取登录后存下的后端菜单树；null 表示本地没有菜单数据（未登录 / 权限接口未返回） */
export function useMenuTree(): PermissionMenu[] | null {
  const [tree, setTree] = useState<PermissionMenu[] | null>(() => getMenuTree<PermissionMenu[]>())

  useEffect(() => {
    const reload = () => setTree(getMenuTree<PermissionMenu[]>())
    listeners.add(reload)
    return () => {
      listeners.delete(reload)
    }
  }, [])

  // 空数组必须原样返回：调用方要靠它把侧边栏渲染成「无菜单」，不能当成 null 去回退静态菜单
  return tree
}

/**
 * 始终放行的路径前缀：错误页、设置、帮助中心、首页不参与权限拦截
 *
 * /dashboard 列入白名单的原因：首页是「工作台/概览」，数据由后端按权限逐块裁剪
 * （没权限的块返回 null，前端直接不渲染）。如果按菜单授权拦截整页，
 * 没勾「仪表盘」菜单的账号登录后会被甩到 403 或被迫落到别的页面 —— 首页不该是这个体验。
 */
const ALWAYS_ALLOWED = ['/', '/dashboard', '/errors', '/settings', '/help-center']

/**
 * 判断路径是否允许访问：
 * 1. 白名单前缀直接放行
 * 2. 精确命中角色可见菜单
 * 3. 是某个可见菜单的父级路径（如 /system/log 之于 /system/log/login）
 */
export function isPathAllowed(pathname: string, permitted: Set<string>): boolean {
  if (ALWAYS_ALLOWED.some(p => pathname === p || (p !== '/' && pathname.startsWith(p + '/')))) return true
  if (permitted.has(pathname)) return true
  for (const p of permitted) {
    if (p.startsWith(pathname + '/')) return true
  }
  return false
}
