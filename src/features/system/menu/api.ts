import { downloadFromApi } from '@/lib/download'
import { getApiResult, type PageResult } from '@/lib/http'

/** 后端 sys_permission（对齐 JeecgBoot），菜单管理页用的完整结构 */
export interface Menu {
  id: string
  parentId?: string | null
  /** 菜单/按钮名称 */
  name: string
  /** 路由路径（按钮为 null） */
  url?: string | null
  component?: string | null
  componentName?: string | null
  redirect?: string | null
  /** 0 目录 / 1 子菜单 / 2 按钮 */
  menuType: number
  /** 按钮权限编码（如 system:user:add） */
  perms?: string | null
  permsType?: string
  sortNo: number
  icon?: string | null
  isRoute?: number
  hidden?: number
  /** '1' 有效 / '0' 停用 */
  status: string
  description?: string | null
  createTime?: string
  updateTime?: string
  delFlag?: number
}

export type MenuWritePayload = Partial<Omit<Menu, 'id' | 'delFlag' | 'createTime' | 'updateTime'>> & {
  name: string
  menuType: number
}

/** 菜单全量列表（统一分页结构；扁平，前端自行组树） */
export async function fetchMenus(): Promise<Menu[]> {
  const page = await getApiResult<PageResult<Menu>>('/backend-api/v1/menus')
  return page.records
}

/** 菜单树（后端组好层级） */
export function fetchMenuTree(): Promise<Array<Menu & { children: Menu[] }>> {
  return getApiResult<Array<Menu & { children: Menu[] }>>('/backend-api/v1/menus/tree')
}

export function createMenu(payload: MenuWritePayload): Promise<Menu> {
  return getApiResult<Menu>('/backend-api/v1/menus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function updateMenu(id: string, payload: MenuWritePayload): Promise<Menu> {
  return getApiResult<Menu>(`/backend-api/v1/menus/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function deleteMenu(id: string): Promise<unknown> {
  return getApiResult<unknown>(`/backend-api/v1/menus/${id}`, { method: 'DELETE' })
}

/** 菜单类型展示 */
export const menuTypeMap: Record<number, string> = { 0: '目录', 1: '菜单', 2: '按钮' }

/** 导出菜单权限快照（扁平导出，含按钮权限；用于留档与环境比对，不支持导回） */
export function exportMenus(): Promise<{ filename: string; blob: Blob }> {
  return downloadFromApi('/v1/menus/export', 'menus.xlsx')
}
