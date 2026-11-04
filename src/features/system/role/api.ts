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

/* ---------- 角色增删改查（旧路由 /api/roles，暂保留） ---------- */

export function fetchRoles(): Promise<Role[]> {
  return getApiResult<Role[]>('/backend-api/roles')
}

export interface RoleWritePayload {
  roleName?: string
  roleCode?: string
  description?: string
  menuIds?: string[]
}

export function createRole(payload: RoleWritePayload): Promise<Role> {
  return getApiResult<Role>('/backend-api/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function updateRole(id: string, payload: RoleWritePayload): Promise<Role> {
  return getApiResult<Role>(`/backend-api/roles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function deleteRole(id: string): Promise<void> {
  return getApiResult<null>(`/backend-api/roles/${id}`, { method: 'DELETE' })
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
