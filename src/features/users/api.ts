import { getJson } from '@/lib/http'

export type UserStatus = 'active' | 'inactive' | 'invited' | 'suspended'
export type UserRole = 'superadmin' | 'admin' | 'manager' | 'cashier'

export interface User {
  id: number
  name: string
  username: string
  email: string
  phone: string
  status: UserStatus
  role: UserRole
  createdAt: string
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchUsers(): Promise<User[]> {
  return getJson<User[]>('/mock/users.json')
}
