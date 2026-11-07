/**
 * 本机「记住密码」凭证
 *
 * 登录页与锁屏解锁共用同一份记录：登录成功勾选「记住密码」时写入，锁屏解锁时读出来自动填充，
 * 避免每次锁屏都由用户手动重输。集中在这里是为了两处读写同一份格式，别各写一套解析。
 *
 * 安全说明（有意为之，不是遗漏）：password 只做 base64 编码，不是加密——
 * 同源脚本本来就能读到 localStorage，加一层「伪加密」只防肉眼可见的明文；
 * 真正能挡的是「不勾选」和「到期自动失效」。公共设备建议不要勾选。
 */
export const REMEMBER_KEY = 'concise-remember'

/** 记住密码可选有效期（天） */
export const REMEMBER_OPTIONS = [1, 7, 15] as const
export type RememberDays = (typeof REMEMBER_OPTIONS)[number]
export const REMEMBER_DAYS_DEFAULT: RememberDays = 7

export interface RememberedLogin {
  username: string
  /** base64(encodeURIComponent(password)) */
  secret: string
  days: RememberDays
  /** 过期时间戳（ms） */
  expireAt: number
}

/** 读取有效记录；过期 / 损坏的记录顺手清掉，避免带着脏数据继续跑 */
export function readRemember(): RememberedLogin | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as RememberedLogin
    if (!data.expireAt || data.expireAt < Date.now()) {
      localStorage.removeItem(REMEMBER_KEY)
      return null
    }
    return data
  } catch {
    localStorage.removeItem(REMEMBER_KEY)
    return null
  }
}

function decodeSecret(secret: string): string {
  try {
    return decodeURIComponent(atob(secret))
  } catch {
    return ''
  }
}

/**
 * 取「本设备记住的、且属于当前登录账号」的密码
 *
 * 必须校验用户名：同一台电脑换人登录过而没清记录时，不能把上一个人的密码填进来。
 */
export function readRememberPassword(username?: string | null): string | null {
  const data = readRemember()
  if (!data) return null
  if (username && data.username.toLowerCase() !== username.toLowerCase()) return null
  const password = decodeSecret(data.secret)
  return password || null
}

export function writeRemember(username: string, password: string, days: RememberDays): void {
  const data: RememberedLogin = {
    username,
    secret: btoa(encodeURIComponent(password)),
    days,
    expireAt: Date.now() + days * 24 * 60 * 60 * 1000
  }
  localStorage.setItem(REMEMBER_KEY, JSON.stringify(data))
}

export function clearRemember(): void {
  localStorage.removeItem(REMEMBER_KEY)
}
