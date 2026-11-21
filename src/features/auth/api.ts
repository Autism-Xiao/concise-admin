import { getApiResult } from '@/lib/http'

/* ---------- 真实后端（Go）：/backend-api 由 vite 代理到 BACKEND_URL ---------- */

/**
 * 滑块验证码挑战：图片为后端程序化生成的 PNG dataURL。
 *
 * `enabled` 是后端 CAPTCHA_ENABLED 的镜像：为 false 时后端只回 `{ enabled: false }`（不出图、不碰 Redis），
 * 登录页据此隐藏滑块且不要求 ticket —— 关闭验证码的部署不该被滑块挡住登录。
 */
export interface CaptchaChallenge {
  enabled: boolean
  captchaId?: string
  /** 带缺口的背景图 */
  bgUrl?: string
  /** 拼图条 */
  puzzleUrl?: string
}

export function fetchCaptcha(): Promise<CaptchaChallenge> {
  return getApiResult<CaptchaChallenge>('/backend-api/v1/auth/captcha')
}

/** 校验滑块位置，通过后返回一次性 ticket（2 分钟有效），登录时作为 captchaTicket 传入 */
export function verifyCaptcha(captchaId: string, x: number): Promise<{ ticket: string }> {
  return getApiResult<{ ticket: string }>('/backend-api/v1/auth/captcha/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ captchaId, x })
  })
}

export interface LoginPayload {
  username: string
  password: string
  /** 滑块验证通过后换取的一次性票据 */
  captchaTicket?: string
  /** 两步验证 6 位动态码（账号开启 2FA 后登录必填，见 BIZ_CODE.TOTP_REQUIRED） */
  totpCode?: string
  /** 勾选「记住登录」：后端签发 Redis 凭证用于免密续登（不存密码） */
  rememberMe?: boolean
  /** 记住有效期（天），后端收敛到 1-15 */
  rememberDays?: number
  /** 设备指纹：凭证与设备绑定，换设备续登会被拒 */
  deviceId?: string
}

/** 登录成功返回的 data：字段名做宽松兼容，接后端联调后再收紧 */
export interface LoginResult {
  token?: string
  accessToken?: string
  refreshToken?: string
  /** 密码已过期或被管理员标记：前端必须先引导改密，改完才放行进入系统 */
  mustChangePassword?: boolean
  /** 勾选「记住登录」且后端启用时返回：本机只存这张凭证，密码不再落盘 */
  rememberToken?: string
  /** 后端收敛后的实际记住天数 */
  rememberDays?: number
  userInfo?: {
    username?: string
    nickname?: string
    realname?: string
    name?: string
    role?: string
    /** 头像相对路径（/upload/...），登录后缓存供顶栏/侧边栏显示 */
    avatar?: string | null
    /** 后端实际返回角色对象数组 [{ roleCode }] */
    roles?: Array<string | { roleCode?: string }>
  }
  user?: {
    username?: string
    nickname?: string
    realname?: string
    name?: string
    role?: string
    avatar?: string | null
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

/* ---------- 记住登录凭证（方案 C）：免密续登 / 吊销 ---------- */

/** 用记住凭证 + 设备绑定换新令牌对；失效（过期/改密/换设备）会抛 401 错误 */
export function exchangeRememberLogin(token: string, deviceId: string): Promise<LoginResult> {
  return getApiResult<LoginResult>('/backend-api/v1/auth/remember/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, deviceId })
  })
}

/** 登出时吊销服务端凭证记录（幂等，token 不存在也返回成功） */
export function revokeRememberLogin(token: string): Promise<{ revoked: boolean }> {
  return getApiResult<{ revoked: boolean }>('/backend-api/v1/auth/remember/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  })
}

/* ---------- 登录后权限汇总：GET /backend-api/v1/auth/permissions ---------- */

export interface PermissionMenu {
  id: string
  parentId?: string | null
  /** 菜单名（真实后端字段） */
  name?: string
  /** 兼容旧字段（title） */
  title?: string
  /** 路由地址（真实后端字段，按钮节点为 null） */
  url?: string | null
  /** 兼容旧字段（path） */
  path?: string | null
  /** 菜单类型：0 目录 / 1 菜单 / 2 按钮权限 */
  menuType?: number
  /** 1 表示不在侧边栏显示 */
  hidden?: number | null
  /** '0' 表示停用（真实后端为字符串状态） */
  status?: string
  /** 同级排序（真实后端字段），越小越靠前 */
  sortNo?: number
  /** 兼容旧字段（sort） */
  sort?: number
  /** 后端图标名（可选，前端优先按路由从 PAGE_REGISTRY 取图标） */
  icon?: string | null
  /** 是否路由菜单：0 内链（iframe 嵌入）/ 1 组件路由；按钮/目录恒为 1 */
  isRoute?: number | null
  /** 外链打开方式：0 内部打开 / 1 外部新窗口 */
  internalOrExternal?: number | null
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

/* ---------- SSO 单点登录：GET config / POST exchange ---------- */

/** 后端 SSO 开关：登录页据此决定是否展示「单点登录」按钮 */
export function fetchSsoConfig(): Promise<{ enabled: boolean }> {
  return getApiResult<{ enabled: boolean }>('/backend-api/v1/auth/sso/config')
}

/** SSO 回调一次性 code 换取令牌：与密码登录同构的返回结构 */
export function exchangeSsoCode(code: string): Promise<LoginResult> {
  return getApiResult<LoginResult>('/backend-api/v1/auth/sso/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  })
}

/* ---------- 两步验证（TOTP）：GET/POST /backend-api/v1/auth/2fa/* ---------- */

/** 当前账号是否已开启两步验证 */
export function fetchTwoFactorStatus(): Promise<{ enabled: boolean; remainingBackupCodes: number }> {
  return getApiResult<{ enabled: boolean; remainingBackupCodes: number }>('/backend-api/v1/auth/2fa/status')
}

/** 发起绑定：验证当前密码后生成密钥与 otpauth:// URI（前端渲染二维码）；重复调用换新密钥，旧二维码作废 */
export function setupTwoFactor(password: string): Promise<{ otpauthUrl: string }> {
  return getApiResult<{ otpauthUrl: string }>('/backend-api/v1/auth/2fa/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  })
}

/** 用认证器 6 位动态码激活；成功后登录必须携带 totpCode */
export function activateTwoFactor(code: string): Promise<{ enabled: true; backupCodes: string[] }> {
  return getApiResult<{ enabled: true; backupCodes: string[] }>('/backend-api/v1/auth/2fa/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  })
}

/** 重新生成备份恢复码（需当前动态码；旧码全部作废，明文只返回一次） */
export function regenerateBackupCodes(code: string): Promise<{ backupCodes: string[] }> {
  return getApiResult<{ backupCodes: string[] }>('/backend-api/v1/auth/2fa/backup-codes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  })
}

/** 验码关闭两步验证并清除密钥（密码 + 动态码双确认） */
export function deactivateTwoFactor(code: string, password: string): Promise<{ enabled: false }> {
  return getApiResult<{ enabled: false }>('/backend-api/v1/auth/2fa/deactivate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, password })
  })
}

/**
 * 申请重置密码验证码。
 * 后端刻意不区分「账号存在 / 不存在 / 没绑邮箱」，永远返回 sent:true，
 * 所以前端拿到这个结果只代表"请求已受理"，不代表邮件一定发出去了。
 */
export function requestPasswordResetCode(account: string): Promise<{ sent: true; ttlMinutes: number }> {
  return getApiResult<{ sent: true; ttlMinutes: number }>('/backend-api/v1/auth/password/forgot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account })
  })
}

/** 用邮件验证码重置密码；验证码只能成功使用一次 */
export function resetPasswordByCode(payload: { account: string; code: string; newPassword: string }): Promise<{ ok: true }> {
  return getApiResult<{ ok: true }>('/backend-api/v1/auth/password/reset-by-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}
