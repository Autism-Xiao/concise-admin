import { getApiResult } from '@/lib/http'
import { fetchRoles, type Role } from '@/features/system/role/api'

/** 后端 sys_user（对齐 JeecgBoot），只保留页面需要的字段 */
export interface User {
  id: string
  username: string
  realname?: string
  email?: string
  phone?: string
  telephone?: string
  workNo?: string
  sex?: number
  avatar?: string
  birthday?: string
  /** 1 正常 / 2 冻结 */
  status: number
  createTime?: string
  roles?: Pick<Role, 'id' | 'roleName' | 'roleCode'>[]
  depts?: Array<{ id: string; departName: string }>
  /** 主部门 id（后端兼容字段 = depts[0].id） */
  deptId?: string | null
}

export interface UserWritePayload {
  /** 新增必填；编辑时后端不可改，不下发 */
  username?: string
  realname?: string
  /** 新增必填；编辑不传表示不改密码 */
  password?: string
  email?: string
  phone?: string
  telephone?: string
  workNo?: string
  sex?: number
  status?: number
  roleIds?: string[]
  deptIds?: string[]
}

export interface UserListResult {
  items: User[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** 分页查询用户列表（大页容量一次拉全，前端表格本地筛选） */
export function fetchUsers(keyword = '', status = ''): Promise<UserListResult> {
  const params = new URLSearchParams({ page: '1', pageSize: '100' })
  if (keyword) params.set('keyword', keyword)
  if (status) params.set('status', status)
  return getApiResult<UserListResult>(`/backend-api/v1/users?${params.toString()}`)
}

export function createUser(payload: UserWritePayload): Promise<User> {
  return getApiResult<User>('/backend-api/v1/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function updateUser(id: string, payload: UserWritePayload): Promise<User> {
  return getApiResult<User>(`/backend-api/v1/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function deleteUser(id: string): Promise<unknown> {
  return getApiResult<unknown>(`/backend-api/v1/users/${id}`, { method: 'DELETE' })
}

/** 批量删除逐条结算，单个用户删除失败不阻断其他请求 */
export function deleteUsers(ids: string[]): Promise<PromiseSettledResult<unknown>[]> {
  return Promise.allSettled(ids.map(id => deleteUser(id)))
}

export { fetchRoles }
export type { Role }

/** 后端部门列表（/api/v1/depts 扁平结构，供用户表单部门下拉使用） */
export function fetchBackendDepts(): Promise<Array<{ id: string; departName: string; parentId?: string | null }>> {
  return getApiResult<Array<{ id: string; departName: string; parentId?: string | null }>>('/backend-api/v1/depts')
}

/** 新增用户的默认初始密码（创建后应引导用户自行修改） */
export const DEFAULT_PASSWORD = '123456'

/** 状态展示映射（对齐后端 1 正常 / 2 冻结） */
export const userStatusMap: Record<number, { label: string; className: string }> = {
  1: { label: '正常', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  2: { label: '冻结', className: 'bg-destructive/15 text-destructive' }
}
