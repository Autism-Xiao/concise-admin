import { batchDeleteRequest, type BatchDeleteResult } from '@/lib/batch-delete'
import { downloadFromApi } from '@/lib/download'
import { getApiResult } from '@/lib/http'
import { updateUserWatermark, type UserWatermarkPatch, type WatermarkDensity } from '@/lib/watermark'
import { fetchRoleOptions, type Role } from '@/features/system/role/api'

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
  /** 水印原始设置：1 开 / 0 关 / null 继承全局（列表由后端批量组装） */
  watermarkEnabled?: number | null
  /** 强管控：0 不强制 / 1 强制开 / 2 强制关 */
  watermarkEnforced?: number
  /** 最终是否生效（已合并全局策略） */
  watermarkEffective?: boolean
}

export { updateUserWatermark }
export type { UserWatermarkPatch, WatermarkDensity }

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
  records: User[]
  total: number
  current: number
  size: number
  pages: number
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

/** 批量删除用户：走后端统一接口，逐条结算（内置管理员会返回失败原因） */
export function deleteUsers(ids: string[]): Promise<BatchDeleteResult> {
  return batchDeleteRequest('users', ids)
}

export { fetchRoleOptions }
export type { Role }

/** 后端部门列表（/api/v1/depts 扁平结构，供用户表单部门下拉使用） */
export function fetchBackendDepts(): Promise<Array<{ id: string; departName: string; parentId?: string | null }>> {
  return getApiResult<Array<{ id: string; departName: string; parentId?: string | null }>>('/backend-api/v1/depts')
}

/* ---------- 导入导出（/api/v1/users/export | import | import-template） ---------- */

/** 导入结果：后端逐行统计 + 失败明细 */
export interface UserImportResult {
  total: number
  created: number
  updated: number
  skipped: number
  failed: number
  errors: Array<{ row: number; username: string; message: string }>
}

/** 导出用户 Excel（与列表同过滤条件，不传即全量） */
export function exportUsers(params: { keyword?: string; status?: string } = {}): Promise<{ filename: string; blob: Blob }> {
  const qs = new URLSearchParams()
  if (params.keyword) qs.set('keyword', params.keyword)
  if (params.status) qs.set('status', params.status)
  const query = qs.toString()
  return downloadFromApi(`/v1/users/export${query ? `?${query}` : ''}`, 'users.xlsx')
}

/** 下载用户导入模板 Excel（第一个工作表为模板，第二个为填写示例） */
export function downloadUserTemplate(): Promise<{ filename: string; blob: Blob }> {
  return downloadFromApi('/v1/users/import-template', 'users-import-template.xlsx')
}

/** 导入用户（multipart，字段名 file；支持 .xlsx/.csv，按登录账号新增或更新） */
export function importUsers(file: File): Promise<UserImportResult> {
  const form = new FormData()
  form.append('file', file)
  return getApiResult<UserImportResult>('/backend-api/v1/users/import', { method: 'POST', body: form })
}

/** 新增用户的默认初始密码（创建后应引导用户自行修改） */
export const DEFAULT_PASSWORD = '123456'

/** 状态展示映射（对齐后端 1 正常 / 2 冻结） */
export const userStatusMap: Record<number, { label: string; className: string }> = {
  1: { label: '正常', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  2: { label: '冻结', className: 'bg-destructive/15 text-destructive' }
}
