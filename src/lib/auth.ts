const AUTH_KEY = 'concise-auth'

export function isAuthenticated(): boolean {
  return localStorage.getItem(AUTH_KEY) === 'true'
}

export function login(): void {
  localStorage.setItem(AUTH_KEY, 'true')
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY)
}
