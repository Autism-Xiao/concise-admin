import { getApiResult, type PageResult } from '@/lib/http'

/** 展示层文案（后端存 code / 0|1，前端统一用中文，页面不用关心枚举映射） */
export type TenantStatus = '正常' | '停用'
export type TenantPlan = '试用版' | '标准版' | '企业版'

export interface Tenant {
  id: number
  /** 租户（公司）名称 */
  name: string
  /** 租户编码（全局唯一，创建后作为稳定标识） */
  code: string
  contact: string
  phone: string
  plan: TenantPlan
  /** 开通日期 YYYY-MM-DD */
  beginDate: string
  /** 到期日期 YYYY-MM-DD，空表示永久 */
  expireAt: string
  status: TenantStatus
  remark: string
  /** 租户下的用户数（列表接口带出，避免逐个请求） */
  userCount: number
}

/** 我所属的租户（切换器数据源） */
export interface MyTenant {
  id: number
  name: string
  code: string
  status: number
  expireAt: string | null
  /** 停用或已到期时为 false，切换会被后端拒绝 */
  usable: boolean
}

const API = '/backend-api/v1/tenants'

const PLAN_LABEL: Record<string, TenantPlan> = { trial: '试用版', standard: '标准版', enterprise: '企业版' }
const PLAN_CODE: Record<TenantPlan, string> = { 试用版: 'trial', 标准版: 'standard', 企业版: 'enterprise' }

/** 后端租户实体（关注我们用的字段） */
interface TenantDto {
  id: number
  name: string
  code: string
  contact?: string
  phone?: string
  plan?: string
  beginDate?: string | null
  expireAt?: string | null
  status: number
  remark?: string
  userCount?: number
}

const EMPTY_DATE = ''

function toTenant(dto: TenantDto): Tenant {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    contact: dto.contact ?? '',
    phone: dto.phone ?? '',
    plan: PLAN_LABEL[dto.plan ?? ''] ?? '标准版',
    beginDate: dto.beginDate ?? EMPTY_DATE,
    expireAt: dto.expireAt ?? EMPTY_DATE,
    status: dto.status === 0 ? '正常' : '停用',
    remark: dto.remark ?? '',
    userCount: dto.userCount ?? 0
  }
}

/** 表单值 → 后端 DTO */
function toPayload(values: Omit<Tenant, 'id' | 'userCount'>) {
  return {
    name: values.name,
    code: values.code,
    contact: values.contact,
    phone: values.phone,
    plan: PLAN_CODE[values.plan] ?? 'standard',
    // 空字符串会让 MySQL date 列报错，统一转 null
    beginDate: values.beginDate || null,
    expireAt: values.expireAt || null,
    status: values.status === '正常' ? 0 : 1,
    remark: values.remark
  }
}

/**
 * 租户列表
 *
 * 租户是平台级数据（几十条），一次拉全量交给表格做本地筛选/分页，
 * 避免为「几十行数据」引入服务端分页的翻页状态。
 */
export async function fetchTenants(): Promise<Tenant[]> {
  const page = await getApiResult<PageResult<TenantDto>>(`${API}?current=1&size=200`)
  return page.records.map(toTenant)
}

export function createTenant(values: Omit<Tenant, 'id' | 'userCount'>): Promise<unknown> {
  return getApiResult(`${API}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toPayload(values)) })
}

export function updateTenant(id: number, values: Omit<Tenant, 'id' | 'userCount'>): Promise<unknown> {
  return getApiResult(`${API}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toPayload(values)) })
}

export function deleteTenant(id: number): Promise<unknown> {
  return getApiResult(`${API}/${id}`, { method: 'DELETE' })
}

/* ---------- 我的租户 / 切换（所有登录用户） ---------- */

export function fetchMyTenants(): Promise<{ current: number | null; isSuper: boolean; tenants: MyTenant[] }> {
  return getApiResult(`${API}/mine`)
}

export async function switchTenant(tenantId: number): Promise<number | null> {
  const result = await getApiResult<{ tenantId: number | null }>(`${API}/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId })
  })
  return result?.tenantId ?? null
}

/* ---------- 租户下的用户 ---------- */

export interface TenantUser {
  id: string
  username: string
  realname: string
  status: number
  joinTime: string | null
}

export function fetchTenantUsers(tenantId: number, current = 1, size = 20): Promise<PageResult<TenantUser>> {
  return getApiResult(`${API}/${tenantId}/users?current=${current}&size=${size}`)
}

/** 覆盖式分配：传入的列表即最终名单 */
export function assignTenantUsers(tenantId: number, userIds: string[]): Promise<{ added: number; removed: number }> {
  return getApiResult(`${API}/${tenantId}/users`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userIds })
  })
}

/* ---------- 租户管理员 ---------- */

export interface TenantAdminInput {
  /** 登录账号（全局唯一，不能与已有账号重名） */
  username: string
  realname: string
  password: string
}

/**
 * 为租户开通管理员账号
 *
 * 一步完成「建号 + 加入本租户 + 绑本租户 admin 角色」，不需要再单独分配角色。
 */
export function createTenantAdmin(tenantId: number, values: TenantAdminInput): Promise<unknown> {
  return getApiResult(`${API}/${tenantId}/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values)
  })
}

/* ---------- 默认角色初始化 ---------- */

export interface TenantProvisionRole {
  roleCode: string
  roleId: string
  /** 本次是否新建了角色 */
  created: boolean
  /** 本次新增的授权条数（重复执行为 0） */
  added: number
  /** 角色应有的授权总数 */
  total: number
}

export interface TenantProvisionResult {
  tenantId: number
  roles: TenantProvisionRole[]
}

export interface TenantProvisionAllResult {
  tenants: number
  createdRoles: number
  addedGrants: number
  details: TenantProvisionResult[]
}

/** 给单个租户补齐默认角色（空壳租户补建 / 新菜单上线后补齐授权），幂等 */
export function provisionTenant(id: number): Promise<TenantProvisionResult> {
  return getApiResult(`${API}/${id}/provision`, { method: 'POST' })
}

/** 给全部租户补齐默认角色，幂等 */
export function provisionAllTenants(): Promise<TenantProvisionAllResult> {
  return getApiResult(`${API}/provision-all`, { method: 'POST' })
}
