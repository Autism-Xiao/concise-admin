import { getJson } from '@/lib/http'
import { fetchAccounts, saveAccounts, type Account } from '@/features/auth/api'

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

// 开发环境由 vite 中间件写入 public/mock/users.json；生产环境换成真实接口
export async function saveUsers(users: User[]): Promise<void> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(users)
  })
  if (!res.ok) throw new Error('保存失败')
}

/** 新用户的初始登录密码 */
export const DEFAULT_PASSWORD = '123456'

/** 用户管理的角色 → roles.json 的权限角色码（决定登录后的菜单权限） */
export function mapUserRoleToCode(role: UserRole): string {
  const map: Record<UserRole, string> = {
    superadmin: 'superadmin',
    admin: 'admin',
    manager: 'operator',
    cashier: 'support'
  }
  return map[role]
}

function accountOf(user: User): Account {
  return {
    username: user.username,
    password: DEFAULT_PASSWORD,
    name: user.name,
    role: mapUserRoleToCode(user.role),
    status: user.status === 'active' ? 'active' : 'disabled'
  }
}

/** 新增用户时同步创建登录账号（用户名已存在则跳过） */
export async function createAccountFor(user: User): Promise<void> {
  const accounts = await fetchAccounts()
  if (accounts.some(a => a.username === user.username)) return
  await saveAccounts([...accounts, accountOf(user)])
}

/** 编辑用户时同步账号（改名/姓名/角色/状态）；账号不存在则补建 */
export async function updateAccountFor(prev: User, next: User): Promise<void> {
  const accounts = await fetchAccounts()
  const existing = accounts.find(a => a.username === prev.username)
  if (!existing) {
    await createAccountFor(next)
    return
  }
  // 保留原密码，其余字段跟随用户
  await saveAccounts(accounts.map(a => (a.username === prev.username ? { ...accountOf(next), password: a.password } : a)))
}

/** 删除用户时同步删除登录账号 */
export async function deleteAccountFor(user: User): Promise<void> {
  const accounts = await fetchAccounts()
  await saveAccounts(accounts.filter(a => a.username !== user.username))
}
