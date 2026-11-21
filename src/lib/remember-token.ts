/**
 * 「记住登录」凭证（方案 C：Redis 存凭证，密码永不出镜）
 *
 * 登录成功勾选「记住登录」时，后端签发随机凭证（Redis 只存凭证的 SHA-256 与 refresh 链头，
 * 不存任何密码形态），本机只保存这份凭证。下次进登录页用它 + 设备绑定静默换取令牌对。
 *
 * 与旧版 localStorage 存 base64 密码的区别：本机丢失/被读走的只是一张可吊销的凭证，
 * 改密/重置密码/封号/登出都会让它失效；不再是能还原出真实密码的可逆副本。
 *
 * 锁屏页不受影响：锁屏解锁走 verify-password 手动输密码，与免密续登无关。
 */
const REMEMBER_TOKEN_KEY = 'concise-remember-token'
/** 设备指纹：凭证签发时绑定到本设备，续登时后端比对；换设备（或凭证被拷走）一律失效 */
const DEVICE_ID_KEY = 'concise-device-id'

/** 记住登录可选有效期（天），与后端 clampRememberDays（1-15）对齐 */
export const REMEMBER_OPTIONS = [1, 7, 15] as const
export type RememberDays = (typeof REMEMBER_OPTIONS)[number]
export const REMEMBER_DAYS_DEFAULT: RememberDays = 7

export function getRememberToken(): string {
  return localStorage.getItem(REMEMBER_TOKEN_KEY) || ''
}

/** 空值（后端未签发，如 Redis 未启用）也走这里：清掉旧凭证，避免拿着死 token 反复试 */
export function setRememberToken(token?: string | null): void {
  if (token) localStorage.setItem(REMEMBER_TOKEN_KEY, token)
  else localStorage.removeItem(REMEMBER_TOKEN_KEY)
}

export function clearRememberToken(): void {
  localStorage.removeItem(REMEMBER_TOKEN_KEY)
}

/** 本设备稳定标识：首次生成后持久保存（随机即可，不需要采集任何硬件信息） */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}
