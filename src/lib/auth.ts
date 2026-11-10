import { clearLocalSettings } from '@/lib/settings'

const AUTH_KEY = 'concise-auth'
const USER_KEY = 'concise-user'
const NAME_KEY = 'concise-name'
const ROLE_KEY = 'concise-role'
const TOKEN_KEY = 'concise-token'
const REFRESH_TOKEN_KEY = 'concise-refresh-token'
const PERMS_KEY = 'concise-perms'
const MENUS_KEY = 'concise-menus'
const TABS_KEY = 'concise-tabs'
/** 当前租户 ID（切换器写入，http 层读出来放到 X-Tenant-Id 请求头） */
const TENANT_KEY = 'concise-tenant'
/** 强制改密标记：sessionStorage（关标签页即失效，改完密码清除） */
const MUST_CHANGE_PWD_KEY = 'concise-must-change-pwd'
/**
 * 登录态变化事件
 *
 * 设置 Provider 挂在 `__root` 上一直不卸载，登录用的是 `navigate()` 而非整页刷新，
 * 所以它感知不到「刚刚登录了」。登录/登出时发一个事件，让它重新拉一次云端设置，
 * 否则换设备登录后要手动刷新一次才能看到自己的主题色。
 */
export const AUTH_CHANGED_EVENT = 'concise:auth-changed'

function notifyAuthChanged(): void {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

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
  notifyAuthChanged()
}

export function getUsername(): string {
  return localStorage.getItem(USER_KEY) || 'admin'
}

export function getName(): string {
  return localStorage.getItem(NAME_KEY) || getUsername()
}

/**
 * 更新本地缓存的显示名（个人资料改完姓名后用）
 *
 * 顺手广播一次登录态变化事件：侧边栏 NavUser 只读一次 localStorage，
 * 不广播的话头像旁边的名字要等下次整页刷新才变。
 */
export function setDisplayName(name: string): void {
  localStorage.setItem(NAME_KEY, name)
  notifyAuthChanged()
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
  localStorage.removeItem(TENANT_KEY)
  // 界面偏好是「按账号」的：不清掉的话下一个登录的人会看到上一个人的主题色
  clearLocalSettings()
  // 清掉多标签页缓存，避免下个账号登录后恢复上一个会话打开的页面
  localStorage.removeItem(TABS_KEY)
  // 租户信息缓存（顶栏租户名的水合源）：按账号隔离，登出直接清掉最干净
  localStorage.removeItem('concise-tenant-info')
  // 强制改密标记同样不能跨账号残留
  clearMustChangePassword()
  notifyAuthChanged()
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

/** 当前租户 ID；null 表示不指定（超管平台视角） */
export function getTenantId(): number | null {
  const raw = localStorage.getItem(TENANT_KEY)
  const value = raw ? Number(raw) : NaN
  return Number.isFinite(value) && value > 0 ? value : null
}

/** 切换租户后写入（0 / null 表示回到平台视角，仅超管有效） */
export function setTenantId(tenantId: number | null): void {
  if (tenantId && tenantId > 0) localStorage.setItem(TENANT_KEY, String(tenantId))
  else localStorage.removeItem(TENANT_KEY)
}

/** 按钮级权限判断：超管（'*'）或精确命中编码 */
export function hasPermission(perm: string): boolean {
  const perms = getPermissions()
  return perms.includes('*') || perms.includes(perm)
}

/* ---------- 强制改密标记（密码过期 / 管理员标记下次登录必须改密） ---------- */

export function setMustChangePassword(flag: boolean): void {
  if (flag) sessionStorage.setItem(MUST_CHANGE_PWD_KEY, '1')
  else sessionStorage.removeItem(MUST_CHANGE_PWD_KEY)
}

export function needsPasswordChange(): boolean {
  return sessionStorage.getItem(MUST_CHANGE_PWD_KEY) === '1'
}

/** 强制改密成功后调用（也挂在登出时清掉） */
export function clearMustChangePassword(): void {
  sessionStorage.removeItem(MUST_CHANGE_PWD_KEY)
}
