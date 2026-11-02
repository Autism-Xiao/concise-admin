const AUTH_KEY = 'concise-auth'
const USER_KEY = 'concise-user'

export function isAuthenticated(): boolean {
  return localStorage.getItem(AUTH_KEY) === 'true'
}

export function login(account?: string): void {
  localStorage.setItem(AUTH_KEY, 'true')
  localStorage.setItem(USER_KEY, account?.trim() || 'admin')
}

export function getUsername(): string {
  return localStorage.getItem(USER_KEY) || 'admin'
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(USER_KEY)
}
