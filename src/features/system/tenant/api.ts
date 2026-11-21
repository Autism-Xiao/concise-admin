import { getApiResult, type PageResult } from '@/lib/http'
import { notifyFeaturesReset } from '@/lib/features'

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
/** 租户列表：搜索由接口完成（keyword 模糊匹配名称/编码/联系人）；一次取 100 条足够铺满列表 */
export async function fetchTenants(keyword = ''): Promise<Tenant[]> {
  const qs = new URLSearchParams({ page: '1', pageSize: '100' })
  if (keyword.trim()) qs.set('keyword', keyword.trim())
  const page = await getApiResult<PageResult<TenantDto>>(`${API}?${qs.toString()}`)
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

/* ---------- 即将到期（平台运营视图） ---------- */

/** 即将到期租户项：expired=true 表示已到期未停用（后端读取判定会拦用户进入） */
export interface ExpiringTenant {
  id: number
  name: string
  code: string
  plan: string
  /** YYYY-MM-DD */
  expireAt: string
  /** 剩余天数：0 = 今天到期，负数 = 已过期 N 天 */
  daysLeft: number
  expired: boolean
  ownerUserId: string | null
  ownerName: string | null
  userCount: number
}

/** 未来 N 天内到期的正常租户（含已到期未停用），按到期日升序 */
export function fetchExpiringTenants(days = 30): Promise<ExpiringTenant[]> {
  return getApiResult(`${API}/expiring?days=${days}`)
}

/* ---------- 平台运营仪表盘 ---------- */

/** 概览计数：expiredActive = 已到期但未停用（读取判定会拦用户，运营要人工跟进） */
export interface TenantDashboardOverview {
  total: number
  active: number
  disabled: number
  expiredActive: number
  expiringIn30: number
}

export interface TenantDashboard {
  overview: TenantDashboardOverview
  planDistribution: Array<{ plan: string; count: number }>
  /** 近 6 个自然月新开租户数（含当月） */
  registerTrend: Array<{ month: string; count: number }>
  /** 当月 API 调用量 Top10（metering 攒批有 ≤30s 延迟） */
  apiCallsTop: Array<{ tenantId: number; name: string; calls: number }>
  /** 配额水位：限额 0 = 不限制；只含有限额或有用量的活跃租户 */
  quotaWater: Array<{ tenantId: number; name: string; users: number; maxUsers: number; storageMb: number; maxStorageMb: number }>
}

export function fetchTenantDashboard(): Promise<TenantDashboard> {
  return getApiResult(`${API}/dashboard`)
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
  // 特性开关按租户视角生效：切换后旧租户的开关快照必须作废
  notifyFeaturesReset()
  return result?.tenantId ?? null
}

/* ---------- 自助开通租户（登录用户，需 VIP） ---------- */

/** 开通资格：前端据 canApply/reason 决定显示表单还是升级提示 */
export interface TenantApplyQuota {
  isVip: boolean
  /** VIP 到期时间（ISO；null = 永久） */
  vipExpireAt: string | null
  ownedCount: number
  /** 可开通上限；-1 = 不限制（平台管理员） */
  maxTenants: number
  canApply: boolean
  reason: '' | 'NEED_VIP' | 'QUOTA_EXCEEDED'
}

export interface TenantApplyInput {
  name: string
  code: string
  contact?: string
  phone?: string
  remark?: string
}

export function fetchTenantApplyQuota(): Promise<TenantApplyQuota> {
  return getApiResult(`${API}/apply/quota`)
}

/** 自助开通：成功后当前账号成为该租户管理员，后端已把登录租户切过去 */
export function applyTenant(values: TenantApplyInput): Promise<{ id: number; name: string; code: string }> {
  return getApiResult(`${API}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values)
  })
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

/* ---------- 功能套餐（租户已开通菜单） ---------- */

export interface TenantPackageDetail {
  /** 已开通的菜单 id 全集（含目录/菜单/按钮） */
  menuIds: string[]
  /** 可勾选的租户级菜单树（平台级菜单不在树里） */
  tree: unknown[]
}

/** 查租户套餐（弹窗回显用） */
export function fetchTenantPackage(tenantId: number): Promise<TenantPackageDetail> {
  return getApiResult(`${API}/${tenantId}/menus`)
}

/** 全量重设租户套餐：收窄不回收角色既有授权，读取端按交集生效 */
export function saveTenantPackage(tenantId: number, menuIds: string[]): Promise<{ total: number }> {
  return getApiResult(`${API}/${tenantId}/menus`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ menuIds })
  })
}
