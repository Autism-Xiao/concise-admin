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
    /** 后端实际返回角色对象数组 [{ roleCode }] */
    roles?: Array<string | { roleCode?: string }>
  }
  user?: {
    username?: string
    nickname?: string
    realname?: string
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
