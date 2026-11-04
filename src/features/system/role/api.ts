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

/* ---------- 导入导出（/api/v1/roles/export | import | import-template） ---------- */

/** 导入结果：后端逐行统计 + 失败明细 */
export interface RoleImportResult {
  total: number
  created: number
  updated: number
  skipped: number
  failed: number
  errors: Array<{ row: number; roleCode: string; message: string }>
}

/** 文件下载统一走原生 fetch（需要 blob + Content-Disposition 文件名，不走 JSON 外壳） */
async function downloadFile(path: string, fallbackName: string): Promise<{ filename: string; blob: Blob }> {
  const token = localStorage.getItem('concise-token') ?? ''
  const res = await fetch(`/backend-api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  if (!res.ok) throw new Error(`导出失败: ${res.status}`)
  const disposition = res.headers.get('content-disposition') ?? ''
  const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? fallbackName
  return { filename, blob: await res.blob() }
}

/** 导出角色 CSV（不带 keyword 即全量；与列表同过滤条件需自行拼 query） */
export function exportRoles(keyword = ''): Promise<{ filename: string; blob: Blob }> {
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  return downloadFile(`/v1/roles/export${qs}`, 'roles.csv')
}

/** 下载导入模板 CSV（表头 + 两行示例） */
export function downloadRoleTemplate(): Promise<{ filename: string; blob: Blob }> {
  return downloadFile('/v1/roles/import-template', 'roles-import-template.csv')
}

/** 导入角色 CSV（multipart，字段名 file；按角色编码新增或更新，不动菜单授权） */
export function importRoles(file: File): Promise<RoleImportResult> {
  const form = new FormData()
  form.append('file', file)
  return getApiResult<RoleImportResult>('/backend-api/v1/roles/import', { method: 'POST', body: form })
}
