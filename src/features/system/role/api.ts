import { getJson } from '@/lib/http'

export type RoleStatus = '正常' | '停用'

export interface Role {
  id: number
  name: string
  /** 权限字符 */
  code: string
  userCount: number
  createdAt: string
  status: RoleStatus
  /** 可见菜单 id 列表（对应 menus.json） */
  menus: number[]
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchRoles(): Promise<Role[]> {
  return getJson<Role[]>('/mock/roles.json')
}

// 开发环境由 vite 中间件写入 public/mock/roles.json；生产环境换成真实接口
export async function saveRoles(roles: Role[]): Promise<void> {
  const res = await fetch('/api/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(roles)
  })
  if (!res.ok) throw new Error('保存失败')
}
