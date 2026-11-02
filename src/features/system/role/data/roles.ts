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

export const roles: Role[] = [
  { id: 1, name: '超级管理员', code: 'superadmin', userCount: 2, createdAt: '2025-01-01', status: '正常' },
  { id: 2, name: '管理员', code: 'admin', userCount: 5, createdAt: '2025-02-12', status: '正常' },
  { id: 3, name: '运营', code: 'operator', userCount: 12, createdAt: '2025-03-08', status: '正常' },
  { id: 4, name: '财务', code: 'finance', userCount: 4, createdAt: '2025-04-19', status: '正常' },
  { id: 5, name: '客服', code: 'support', userCount: 8, createdAt: '2025-05-02', status: '正常' },
  { id: 6, name: '访客', code: 'guest', userCount: 31, createdAt: '2025-05-20', status: '停用' }
]
