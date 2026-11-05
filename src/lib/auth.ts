const AUTH_KEY = 'concise-auth'
const USER_KEY = 'concise-user'
const NAME_KEY = 'concise-name'
const ROLE_KEY = 'concise-role'
const TOKEN_KEY = 'concise-token'
const REFRESH_TOKEN_KEY = 'concise-refresh-token'
const PERMS_KEY = 'concise-perms'
const MENUS_KEY = 'concise-menus'
const TABS_KEY = 'concise-tabs'

export interface LoginAccount {
  username: string
  name: string
  /** 角色 code，对应 roles.json 的 code 字段 */
  role: string
}

export function isAuthenticated(): boolean {
  return localStorage.getItem(AUTH_KEY) === 'true'
}

export function login(account: LoginAccount): void {
  localStorage.setItem(AUTH_KEY, 'true')
  localStorage.setItem(USER_KEY, account.username)
  localStorage.setItem(NAME_KEY, account.name)
  localStorage.setItem(ROLE_KEY, account.role)
}

export function getUsername(): string {
  return localStorage.getItem(USER_KEY) || 'admin'
}

export function getName(): string {
  return localStorage.getItem(NAME_KEY) || getUsername()
}

/** 当前用户角色 code（对应 roles.json 的 code 字段），默认超级管理员 */
export function getRoleCode(): string {
  return localStorage.getItem(ROLE_KEY) || 'superadmin'
}

export function setRoleCode(code: string): void {
  localStorage.setItem(ROLE_KEY, code)
}

/** 退出登录：尽力通知后端把令牌拉黑并删在线会话（失败不阻断），随后清空本地凭证 */
export function logout(): void {
  const accessToken = localStorage.getItem(TOKEN_KEY)
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (accessToken) {
    void fetch('/backend-api/v1/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ refreshToken })
    }).catch(() => undefined)
  }
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(NAME_KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(PERMS_KEY)
  localStorage.removeItem(MENUS_KEY)
  // 清掉多标签页缓存，避免下个账号登录后恢复上一个会话打开的页面
  localStorage.removeItem(TABS_KEY)
}

/** 保存后端下发的令牌 */
export function setTokens(accessToken?: string, refreshToken?: string): void {
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken)
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function getAccessToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function getRefreshToken(): string {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || ''
}

/* ---------- 登录后权限数据（来自 GET /backend-api/v1/auth/permissions） ---------- */

/** 保存按钮权限编码汇总（超管为 ['*']） */
export function setPermissions(perms: string[]): void {
  localStorage.setItem(PERMS_KEY, JSON.stringify(perms))
}

export function getPermissions(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PERMS_KEY) || '[]') as string[]
  } catch {
    return []
  }
}

/** 保存按角色过滤的菜单树（侧边栏可见范围的数据源） */
export function setMenuTree(menus: unknown): void {
  localStorage.setItem(MENUS_KEY, JSON.stringify(menus))
}

export function getMenuTree<T>(): T | null {
  try {
    const raw = localStorage.getItem(MENUS_KEY)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

/** 按钮级权限判断：超管（'*'）或精确命中编码 */
export function hasPermission(perm: string): boolean {
  const perms = getPermissions()
  return perms.includes('*') || perms.includes(perm)
}
