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
  title?: string
  name?: string
  path?: string
  /** 菜单类型：0 一级菜单 / 1 子菜单 / 2 按钮权限 */
  menuType?: number
  hidden?: number
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
