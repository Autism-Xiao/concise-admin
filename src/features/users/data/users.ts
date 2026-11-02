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

const firstNames = ['伟', '芳', '娜', '敏', '静', '磊', '洋', '勇', '艳', '杰']
const lastNames = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴']
const statuses: UserStatus[] = ['active', 'inactive', 'invited', 'suspended']
const roles: UserRole[] = ['superadmin', 'admin', 'manager', 'cashier']

export const users: User[] = Array.from({ length: 50 }, (_, i) => {
  const lastName = lastNames[i % lastNames.length]
  const firstName = firstNames[(i * 3) % firstNames.length]
  const name = `${lastName}${firstName}`
  return {
    id: i + 1,
    name,
    username: `user_${i + 1}`,
    email: `user${i + 1}@example.com`,
    phone: `+86 138${String(10000000 + i * 137913).slice(0, 8)}`,
    status: statuses[i % statuses.length],
    role: roles[i % roles.length],
    createdAt: new Date(2025, i % 12, (i % 28) + 1).toISOString().slice(0, 10)
  }
})
