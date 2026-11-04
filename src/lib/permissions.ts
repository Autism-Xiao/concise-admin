import { useEffect, useState } from 'react'
import { getMenuTree, getPermissions, getRoleCode } from '@/lib/auth'
import type { PermissionMenu } from '@/features/auth/api'
import type { Menu } from '@/features/system/menu/api'
import type { Role } from '@/features/system/role/api'

const listeners = new Set<() => void>()

/**
 * 统一取菜单节点的路由地址：真实后端用 url，旧 mock 用 path。
 * 顺带把后端与前端路由不一致的地址映射到前端实际路由。
 */
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
 * 返回 null 表示不做过滤（超级管理员 / 加载中 / 加载失败），避免闪烁。
 * 优先用登录后 GET /v1/auth/permissions 存下的真实菜单树，无则回退 mock。
 */
async function loadPermittedPaths(): Promise<Set<string> | null> {
  const code = getRoleCode()
  if (code === 'superadmin') return null
  // 真实后端：按钮权限里带 '*' 表示超管
  if (getPermissions().includes('*')) return null
  const tree = getMenuTree<PermissionMenu[]>()
  if (tree?.length) {
    const paths = new Set<string>()
    collectPaths(tree, paths)
    return paths
  }
  // 旧 mock 兜底（真实接口异常或未接入时）
  const [menus, roles] = await Promise.all([
    fetch('/mock/menus.json').then(r => r.json() as Promise<Menu[]>),
    fetch('/mock/roles.json').then(r => r.json() as Promise<Role[]>)
  ])
  const role = roles.find(r => r.code === code)
  if (!role) return null
  const ids = new Set(role.menus)
  return new Set(menus.filter(m => ids.has(m.id)).map(m => m.path))
}

export function usePermittedPaths(): Set<string> | null {
  const [paths, setPaths] = useState<Set<string> | null>(null)

  useEffect(() => {
    let alive = true
    const reload = () => {
      loadPermittedPaths()
        .then(p => {
          if (alive) setPaths(p)
        })
        .catch(() => {
          // 加载失败时保持不过滤，避免侧边栏闪烁
        })
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

/** 响应式读取登录后存下的后端菜单树；null 表示回退静态菜单（mock / 接口异常） */
export function useMenuTree(): PermissionMenu[] | null {
  const [tree, setTree] = useState<PermissionMenu[] | null>(() => getMenuTree<PermissionMenu[]>())

  useEffect(() => {
    const reload = () => setTree(getMenuTree<PermissionMenu[]>())
    listeners.add(reload)
    return () => {
      listeners.delete(reload)
    }
  }, [])

  return tree?.length ? tree : null
}

/** 始终放行的路径前缀：错误页、设置、帮助中心不参与权限拦截 */
const ALWAYS_ALLOWED = ['/', '/errors', '/settings', '/help-center']

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
