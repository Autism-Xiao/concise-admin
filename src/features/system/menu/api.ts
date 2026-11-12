import { downloadFromApi } from '@/lib/download'
import { getApiResult, type PageResult } from '@/lib/http'

/** 后端 sys_permission，菜单管理页用的完整结构 */
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
  /** 外链打开方式：0 内部打开 / 1 外部新窗口 */
  internalOrExternal?: number | null
  description?: string | null
  createTime?: string
  updateTime?: string
  delFlag?: number
}

export type MenuWritePayload = Partial<Omit<Menu, 'id' | 'delFlag' | 'createTime' | 'updateTime'>> & {
  name: string
  menuType: number
}

/** 按钮权限节点（「权限节点」穿梭框的条目） */
export interface PermNode {
  name: string
  perms: string
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

/** 全量替换某菜单下的按钮权限节点（未列出的既有按钮会被软删除） */
export function savePermNodes(id: string, nodes: PermNode[]): Promise<{ added: string[]; removed: string[]; kept: string[] }> {
  return getApiResult(`/backend-api/v1/menus/${id}/perm-nodes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodes })
  })
}

/**
 * 标准按钮权限节点池（「权限节点」穿梭框的左侧来源）。
 * perms 前缀由菜单路由地址推导：/system/user + add → system:user:add
 */
export const PERM_NODE_POOL: Array<{ name: string; action: string }> = [
  { name: '查询', action: 'list' },
  { name: '添加', action: 'add' },
  { name: '修改', action: 'update' },
  { name: '删除', action: 'delete' },
  { name: '详情', action: 'detail' },
  { name: '状态', action: 'status' },
  { name: '批量删除', action: 'batchDelete' },
  { name: '添加子级', action: 'addChild' },
  { name: '导入', action: 'import' },
  { name: '导出', action: 'export' },
  { name: '复制', action: 'copy' },
  { name: '启用', action: 'enable' },
  { name: '停用', action: 'disable' },
  { name: '重置密码', action: 'resetPwd' }
]

/** 由路由地址推导权限前缀：/system/user → system:user；推导不了返回空串 */
export function derivePermsPrefix(url?: string | null): string {
  const path = (url ?? '').trim()
  if (!path.startsWith('/')) return ''
  return path
    .slice(1)
    .split('/')
    .filter(Boolean)
    .join(':')
}

/** 菜单类型展示 */
export const menuTypeMap: Record<number, string> = { 0: '目录', 1: '菜单', 2: '按钮' }

/** 导出菜单权限快照（扁平导出，含按钮权限；用于留档与环境比对，不支持导回） */
export function exportMenus(): Promise<{ filename: string; blob: Blob }> {
  return downloadFromApi('/v1/menus/export', 'menus.xlsx')
}
