const AUTH_KEY = 'concise-auth'
const USER_KEY = 'concise-user'
const ROLE_KEY = 'concise-role'

export function isAuthenticated(): boolean {
  return localStorage.getItem(AUTH_KEY) === 'true'
}

export function login(account?: string): void {
  localStorage.setItem(AUTH_KEY, 'true')
  localStorage.setItem(USER_KEY, account?.trim() || 'admin')
  localStorage.setItem(ROLE_KEY, 'superadmin')
}

export function getUsername(): string {
  return localStorage.getItem(USER_KEY) || 'admin'
}

/** 当前用户角色 code（对应 roles.json 的 code 字段），默认超级管理员 */
export function getRoleCode(): string {
  return localStorage.getItem(ROLE_KEY) || 'superadmin'
}

export function setRoleCode(code: string): void {
  localStorage.setItem(ROLE_KEY, code)
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(ROLE_KEY)
}
