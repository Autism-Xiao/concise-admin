import { getApiResult } from '@/lib/http'

/** 后端 RoleEntity（sys_role，字符串主键） */
export interface Role {
  id: string
  roleName?: string
  roleCode: string
  description?: string
  createBy?: string
  createTime?: string
  updateBy?: string
  updateTime?: string
  /** 详情/列表接口带出的已授权菜单（列表接口含完整菜单对象，这里只关心 id） */
  permissions?: Array<{ id: string }>
}

/* ---------- 角色增删改查（/api/v1/roles） ---------- */

/** 角色列表（全量不分页，含已授权菜单；keyword 模糊匹配名称/编码） */
export function fetchRoles(keyword = ''): Promise<Role[]> {
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  return getApiResult<Role[]>(`/backend-api/v1/roles${qs}`)
}

export interface RoleWritePayload {
  roleName?: string
  roleCode?: string
  description?: string
  /** 传入即全量覆盖授权（创建/更新都支持） */
  menuIds?: string[]
}

export function createRole(payload: RoleWritePayload): Promise<Role> {
  return getApiResult<Role>('/backend-api/v1/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function updateRole(id: string, payload: RoleWritePayload): Promise<Role> {
  return getApiResult<Role>(`/backend-api/v1/roles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function deleteRole(id: string): Promise<void> {
  return getApiResult<null>(`/backend-api/v1/roles/${id}`, { method: 'DELETE' }).then(() => undefined)
}

/* ---------- 角色授权（v1） ---------- */

/** 查角色已授权的菜单/按钮 id 列表（授权弹窗回显） */
export function fetchRoleMenuIds(id: string): Promise<string[]> {
  return getApiResult<{ menuIds: string[] }>(`/backend-api/v1/roles/${id}/menu-ids`).then(r => r.menuIds)
}

/** 保存角色菜单/按钮授权（全量覆盖） */
export function saveRoleMenus(id: string, menuIds: string[]): Promise<string[]> {
  return getApiResult<{ menuIds: string[] }>(`/backend-api/v1/roles/${id}/menus`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ menuIds })
  }).then(r => r.menuIds)
}
