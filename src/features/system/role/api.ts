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
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchRoles(): Promise<Role[]> {
  return getJson<Role[]>('/mock/roles.json')
}
