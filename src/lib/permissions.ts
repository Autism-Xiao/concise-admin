import { useEffect, useState } from 'react'
import { getRoleCode } from '@/lib/auth'
import type { Menu } from '@/features/system/menu/api'
import type { Role } from '@/features/system/role/api'

const listeners = new Set<() => void>()

/** 角色权限或当前角色变化后调用，侧边栏等订阅方会重新计算可见菜单 */
export function notifyPermissionsChanged(): void {
  listeners.forEach(l => l())
}

/**
 * 当前角色可见的菜单路径集合。
 * 返回 null 表示不做过滤（超级管理员 / 加载中 / 加载失败），避免闪烁。
 */
async function loadPermittedPaths(): Promise<Set<string> | null> {
  const code = getRoleCode()
  if (code === 'superadmin') return null
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
