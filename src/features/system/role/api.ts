import { batchDeleteRequest, type BatchDeleteResult } from '@/lib/batch-delete'
import { getApiResult, type PageResult } from '@/lib/http'

/** 后端 RoleEntity（sys_role，字符串主键） */
export interface Role {
  id: string
  roleName?: string
  roleCode: string
  description?: string
  /** 数据范围：1 全部 / 2 本部门及以下 / 3 本部门 / 4 仅本人 */
  dataScope?: number
  /** 状态：1 正常 / 0 停用（停用后不参与权限计算、不可再分配给用户） */
  status?: number
  createBy?: string
  createTime?: string
  updateBy?: string
  updateTime?: string
  /** 详情/列表接口带出的已授权菜单（列表接口含完整菜单对象，这里只关心 id） */
  permissions?: Array<{ id: string }>
  /** 归属租户 id：0 = 平台共享（所有租户可见），>0 = 该租户私有；平台视角下用于分组/筛选 */
  tenantId?: number
  /** 归属租户名：平台视角下后端为租户角色（tenant_id>0）附加，用于区分各租户的同名角色模板 */
  tenantName?: string
}

/* ---------- 角色增删改查（/api/v1/roles） ---------- */

/** 角色列表（统一分页结构，全量返回；keyword 模糊匹配名称/编码） */
export async function fetchRoles(keyword = ''): Promise<Role[]> {
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  const page = await getApiResult<PageResult<Role>>(`/backend-api/v1/roles${qs}`)
  return page.records
}

/**
 * 角色下拉选项：只含 id/名称/编码，登录即可用（不需要 system:role:list）。
 * 用户表单分配角色、用户列表筛选等跨模块下拉统一走这里，避免被角色管理权限卡住。
 */
export function fetchRoleOptions(): Promise<Role[]> {
  return getApiResult<Role[]>('/backend-api/v1/roles/options')
}

export interface RoleWritePayload {
  roleName?: string
  roleCode?: string
  description?: string
  /** 数据范围：1 全部 / 2 本部门及以下 / 3 本部门 / 4 仅本人 */
  dataScope?: number
  /** 状态：1 正常 / 0 停用 */
  status?: number
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

/** 批量删除逐条结算，单个角色删除失败不阻断其他请求 */
/** 批量删除角色：走后端统一接口，逐条结算（内置角色/有用户的会返回失败原因） */
export function deleteRoles(ids: string[]): Promise<BatchDeleteResult> {
  return batchDeleteRequest('roles', ids)
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

/** 导出角色 Excel（不带 keyword 即全量；与列表同过滤条件需自行拼 query） */
export function exportRoles(keyword = ''): Promise<{ filename: string; blob: Blob }> {
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  return downloadFile(`/v1/roles/export${qs}`, 'roles.xlsx')
}

/** 下载导入模板 Excel（表头 + 两行示例） */
export function downloadRoleTemplate(): Promise<{ filename: string; blob: Blob }> {
  return downloadFile('/v1/roles/import-template', 'roles-import-template.xlsx')
}

/** 导入角色（multipart，字段名 file；支持 .xlsx/.csv，按角色编码新增或更新，不动菜单授权） */
export function importRoles(file: File): Promise<RoleImportResult> {
  const form = new FormData()
  form.append('file', file)
  return getApiResult<RoleImportResult>('/backend-api/v1/roles/import', { method: 'POST', body: form })
}
