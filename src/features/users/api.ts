import { batchDeleteRequest, type BatchDeleteResult } from '@/lib/batch-delete'
import { downloadFromApi } from '@/lib/download'
import { getApiResult, type PageResult } from '@/lib/http'
import {
  batchUpdateUsersWatermark,
  updateUserWatermark,
  type BatchWatermarkMode,
  type BatchWatermarkResult,
  type UserWatermarkPatch,
  type WatermarkDensity
} from '@/lib/watermark'
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
  /** 头像相对路径；null / 缺省 = 系统默认头像 */
  avatar?: string | null
  birthday?: string
  /** 1 正常 / 2 冻结 */
  status: number
  createTime?: string
  /** 个人简介（个人资料页可自助编辑，255 字符） */
  bio?: string | null
  /** 回收站行用：软删时间（update_time） */
  updateTime?: string
  roles?: Pick<Role, 'id' | 'roleName' | 'roleCode'>[]
  depts?: Array<{ id: string; departName: string }>
  /** 岗位列表（sys_user_post） */
  posts?: Array<{ id: string; postName?: string; postCode?: string }>
  /** 职级 ID（sys_level，单选可空） */
  levelId?: string | null
  /** 职级（后端批量组装，只含 id/levelName） */
  level?: { id: string; levelName: string } | null
  /** 密码过期时间（ISO 字符串；空 = 不限制） */
  passwordExpireAt?: string | null
  /** 下次登录强制改密：1 是 / 0 否 */
  mustChangePassword?: number
  /** 主部门 id（后端兼容字段 = depts[0].id） */
  deptId?: string | null
  /** 水印原始设置：1 开 / 0 关 / null 继承全局（列表由后端批量组装） */
  watermarkEnabled?: number | null
  /** 强管控：0 不强制 / 1 强制开 / 2 强制关 */
  watermarkEnforced?: number
  /** 最终是否生效（已合并全局策略） */
  watermarkEffective?: boolean
}

export { batchUpdateUsersWatermark, updateUserWatermark }
export type { BatchWatermarkMode, BatchWatermarkResult, UserWatermarkPatch, WatermarkDensity }

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
  postIds?: string[]
  /** 职级 ID（单选；null/'' 表示不设置） */
  levelId?: string | null
  /** 密码过期时间（YYYY-MM-DD 或 ISO；不传表示不改，传空串清除） */
  passwordExpireAt?: string | null
  /** 下次登录强制改密：1 是 / 0 否 */
  mustChangePassword?: number
}

export interface UserListResult {
  records: User[]
  total: number
  current: number
  size: number
  pages: number
}

/** 用户简要信息（选人控件回显用：只有 id / 账号 / 姓名） */
export interface UserBrief {
  id: string
  username: string
  realname?: string
}

/**
 * 批量按 ID 查账号（选人控件回显）：最多 100 个，后端过滤已软删；
 * 登录即可调用，不要求 system:user:list，公告/日程等场景也能回显已选人。
 */
export function lookupUsers(ids: string[]): Promise<UserBrief[]> {
  const list = ids.map(id => id.trim()).filter(Boolean).slice(0, 100)
  if (!list.length) return Promise.resolve([])
  return getApiResult<UserBrief[]>(`/backend-api/v1/users/lookup?ids=${encodeURIComponent(list.join(','))}`)
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

/** 批量启用/停用：与单条同规则（admin 不可停用、停用踢会话），单条失败不阻断 */
export function batchUpdateUsersStatus(ids: string[], status: 1 | 2, reason?: string): Promise<{ updated: number; kicked: number; skipped: Array<{ id: string; username: string; reason: string }> }> {
  return getApiResult('/backend-api/v1/users/batch-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, status, reason: reason || undefined })
  })
}

/** 批量分配角色：对列表内每个用户全量覆盖绑定同一组角色 */
export function batchAssignRoles(ids: string[], roleIds: string[]): Promise<{ updated: number }> {
  return getApiResult('/backend-api/v1/users/batch-roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, roleIds })
  })
}

/** 清除用户权限缓存：按用户挂的角色逐个失效（改角色/权限后未生效时用） */
export function clearUserPermissionCache(id: string): Promise<{ cleared: number }> {
  return getApiResult(`/backend-api/v1/users/${id}/permission-cache`, { method: 'DELETE' })
}

/** 管理员重置用户头像：清除自定义头像，恢复系统默认 */
export function resetUserAvatar(id: string): Promise<{ avatar: string | null }> {
  return getApiResult(`/backend-api/v1/users/${id}/avatar`, { method: 'DELETE' })
}

/** 设置我的头像：avatar 传上传接口返回的相对路径；空串/null 清除 */
export function setMyAvatar(avatar: string | null): Promise<{ avatar: string | null }> {
  return getApiResult('/backend-api/v1/users/me/avatar', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ avatar: avatar ?? '' })
  })
}

/* ---------- 个人资料自助（/v1/users/me） ---------- */

/**
 * 我的资料可编辑字段：空串 = 清空该字段（后端会归一成 NULL）
 *
 * 只有白名单字段能改 —— 账号、工号、状态、角色、部门、密码都不在这个接口里，
 * 后端也会用 whitelist 把多余键丢掉，前端就算拼错字段名也不会越权。
 */
export interface MyProfilePatch {
  realname?: string
  email?: string
  phone?: string
  telephone?: string
  sex?: number
  birthday?: string
  bio?: string
}

/** 当前登录用户的完整资料（含角色/部门/岗位/职级）；登录即可调用，不需要 system:user:list */
export function fetchMyProfile(): Promise<User> {
  return getApiResult<User>('/backend-api/v1/users/me')
}

/** 自助更新个人资料：返回更新后的完整资料 */
export function updateMyProfile(payload: MyProfilePatch): Promise<User> {
  return getApiResult<User>('/backend-api/v1/users/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export { fetchRoleOptions }
export type { Role }

/** 后端部门列表（/api/v1/depts 扁平结构，供用户表单部门下拉使用；响应为统一分页结构） */
export async function fetchBackendDepts(): Promise<Array<{ id: string; departName: string; parentId?: string | null; status?: string }>> {
  const page = await getApiResult<{ records: Array<{ id: string; departName: string; parentId?: string | null; status?: string }> }>('/backend-api/v1/depts')
  return page.records
}

/* ---------- 管理操作：重置密码 / 冻结 / 强制下线 / 解锁 / 回收站 ---------- */

/** 重置密码：password 留空则后端生成 12 位随机口令；明文仅在本次返回，务必立即展示给管理员 */
export function resetUserPassword(id: string, password?: string): Promise<{ password: string }> {
  return getApiResult<{ password: string }>(`/backend-api/v1/users/${id}/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: password || undefined })
  })
}

/** 冻结/解冻：status 1 正常 / 2 冻结（冻结自动踢掉全部在线会话），返回踢掉会话数 */
export function updateUserStatus(id: string, status: 1 | 2): Promise<{ status: number; kicked: number }> {
  return getApiResult<{ status: number; kicked: number }>(`/backend-api/v1/users/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
}

/** 强制下线：踢掉该用户全部在线会话，返回踢掉会话数 */
export function forceOfflineUser(id: string): Promise<{ kicked: number }> {
  return getApiResult<{ kicked: number }>(`/backend-api/v1/users/${id}/force-offline`, { method: 'POST' })
}

/** 解锁账号：清零登录失败计数（幂等） */
export function unlockUser(id: string): Promise<{ unlocked: true }> {
  return getApiResult<{ unlocked: true }>(`/backend-api/v1/users/${id}/lock`, { method: 'DELETE' })
}

/** 回收站：已软删用户分页列表 */
export function fetchRecycledUsers(params: { keyword?: string; page?: number; pageSize?: number } = {}): Promise<PageResult<User>> {
  const qs = new URLSearchParams()
  if (params.keyword) qs.set('keyword', params.keyword)
  qs.set('page', String(params.page ?? 1))
  qs.set('pageSize', String(params.pageSize ?? 10))
  return getApiResult<PageResult<User>>(`/backend-api/v1/users/recycled?${qs.toString()}`)
}

/** 恢复软删用户：可顺带重绑角色/部门；用户名被占用时后端拒绝 */
export function restoreUser(id: string, payload: { roleIds?: string[]; deptIds?: string[] } = {}): Promise<User> {
  return getApiResult<User>(`/backend-api/v1/users/${id}/restore`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

/** 自助修改密码：验旧密码；成功后其他端全部下线，当前会话保留 */
export function changeMyPassword(oldPassword: string, newPassword: string): Promise<{ changed: true }> {
  return getApiResult<{ changed: true }>('/backend-api/v1/auth/password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPassword, newPassword })
  })
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
