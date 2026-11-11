import { getApiResult } from '@/lib/http'

/* ---------- 真实后端（Go）：/backend-api 由 vite 代理到 BACKEND_URL ---------- */

/** 滑块验证码挑战：图片为后端程序化生成的 PNG dataURL */
export interface CaptchaChallenge {
  captchaId: string
  /** 带缺口的背景图 */
  bgUrl: string
  /** 拼图条 */
  puzzleUrl: string
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
}

/** 登录成功返回的 data：字段名做宽松兼容，接后端联调后再收紧 */
export interface LoginResult {
  token?: string
  accessToken?: string
  refreshToken?: string
  /** 密码已过期或被管理员标记：前端必须先引导改密，改完才放行进入系统 */
  mustChangePassword?: boolean
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
export function fetchTwoFactorStatus(): Promise<{ enabled: boolean }> {
  return getApiResult<{ enabled: boolean }>('/backend-api/v1/auth/2fa/status')
}

/** 发起绑定：生成密钥与 otpauth:// URI（前端渲染二维码）；重复调用换新密钥，旧二维码作废 */
export function setupTwoFactor(): Promise<{ otpauthUrl: string }> {
  return getApiResult<{ otpauthUrl: string }>('/backend-api/v1/auth/2fa/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  })
}

/** 用认证器 6 位动态码激活；成功后登录必须携带 totpCode */
export function activateTwoFactor(code: string): Promise<{ enabled: true }> {
  return getApiResult<{ enabled: true }>('/backend-api/v1/auth/2fa/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  })
}

/** 验码关闭两步验证并清除密钥 */
export function deactivateTwoFactor(code: string): Promise<{ enabled: false }> {
  return getApiResult<{ enabled: false }>('/backend-api/v1/auth/2fa/deactivate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  })
}
