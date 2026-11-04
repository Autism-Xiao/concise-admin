import { getApiResult, getJson } from '@/lib/http'
import type { LoginAccount } from '@/lib/auth'

export type AccountStatus = 'active' | 'disabled'

export type Account = LoginAccount & {
  password: string
  /** disabled 时禁止登录 */
  status: AccountStatus
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时换成登录接口
export function fetchAccounts(): Promise<Account[]> {
  return getJson<Account[]>('/mock/accounts.json')
}

// 开发环境由 vite 中间件写入 public/mock/accounts.json；生产环境换成真实接口
export async function saveAccounts(accounts: Account[]): Promise<void> {
  const res = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accounts)
  })
  if (!res.ok) throw new Error('保存失败')
}

/* ---------- 真实后端（Go）：/backend-api 由 vite 代理到 BACKEND_URL ---------- */

export interface CaptchaData {
  captchaId: string
  /** SVG 字符串，直接渲染 */
  svg: string
}

export function fetchCaptcha(): Promise<CaptchaData> {
  return getApiResult<CaptchaData>('/backend-api/v1/auth/captcha')
}

export interface LoginPayload {
  username: string
  password: string
  captchaId: string
  captchaCode: string
}

/** 登录成功返回的 data：字段名做宽松兼容，接后端联调后再收紧 */
export interface LoginResult {
  token?: string
  accessToken?: string
  refreshToken?: string
  userInfo?: {
    username?: string
    nickname?: string
    name?: string
    role?: string
    /** 后端实际返回角色对象数组 [{ roleCode }] */
    roles?: Array<string | { roleCode?: string }>
  }
  user?: {
    username?: string
    nickname?: string
    name?: string
    role?: string
    roles?: Array<string | { roleCode?: string }>
  }
}

export function loginRequest(payload: LoginPayload): Promise<LoginResult> {
  return getApiResult<LoginResult>('/backend-api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

/* ---------- 登录后权限汇总：GET /backend-api/v1/auth/permissions ---------- */

export interface PermissionMenu {
  id: string
  parentId?: string | null
  /** 菜单名（真实后端字段） */
  name?: string
  /** 兼容 mock 的标题字段 */
  title?: string
  /** 路由地址（真实后端字段，按钮节点为 null） */
  url?: string | null
  /** 兼容 mock 的路由字段 */
  path?: string | null
  /** 菜单类型：0 目录 / 1 菜单 / 2 按钮权限 */
  menuType?: number
  /** 1 表示不在侧边栏显示 */
  hidden?: number | null
  /** '0' 表示停用（真实后端为字符串状态） */
  status?: string
  /** 同级排序（真实后端字段），越小越靠前 */
  sortNo?: number
  /** 兼容 mock 的排序字段 */
  sort?: number
  /** 后端图标名（可选，前端优先按路由从 PAGE_REGISTRY 取图标） */
  icon?: string | null
  children?: PermissionMenu[]
}

export interface PermissionSummary {
  roles: string[]
  /** 按钮权限编码；超管为 ['*'] */
  permissions: string[]
  menus: PermissionMenu[]
}

export function fetchPermissions(): Promise<PermissionSummary> {
  return getApiResult<PermissionSummary>('/backend-api/v1/auth/permissions')
}
