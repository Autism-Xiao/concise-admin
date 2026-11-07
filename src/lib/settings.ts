export type FontSize = 'small' | 'default' | 'large'
export type SidebarVariant = 'sidebar' | 'floating' | 'inset'
export type LayoutMode = 'default' | 'compact' | 'offcanvas'
export type Direction = 'ltr' | 'rtl'

export interface AppSettings {
  fontSize: FontSize
  /** 主题色预设名（对应 theme-presets.ts），default 表示跟随默认主题，custom 表示自定义颜色 */
  themeColor: string
  /** 自定义主题色（themeColor 为 custom 时生效），格式 #rrggbb */
  customColor: string
  /** 灰色模式 */
  grayscale: boolean
  /** 色弱模式 */
  colorWeak: boolean
  /** 侧边栏样式 */
  sidebarVariant: SidebarVariant
  /** 布局模式：默认展开 / 紧凑图标 / 隐藏（offcanvas） */
  layout: LayoutMode
  /** 文字方向 */
  direction: Direction
}

export const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 'default',
  themeColor: 'default',
  customColor: '#2563eb',
  grayscale: false,
  colorWeak: false,
  sidebarVariant: 'sidebar',
  layout: 'default',
  direction: 'ltr'
}

/** 设置快照：内容 + 最后修改时间（毫秒），用于「本地 vs 云端」谁更新的比较 */
export interface SettingsSnapshot {
  settings: AppSettings
  updatedAt: number
}

const LOCAL_KEY = 'concise-settings'
/** 首帧样式缓存：index.html 的内联脚本读它，保证刷新时不会先闪默认主题 */
export const FIRST_PAINT_CSS_KEY = 'concise-settings-css'

/** 云端接口：登录用户自己的设置；不带 token 时直接跳过（本地兜底） */
const API = '/backend-api/v1/users/me/settings'

const TOKEN_KEY = 'concise-token'

function safeMerge(raw: unknown): AppSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULT_SETTINGS }
  // 未知键无副作用（后端同样按白名单裁剪），这里只保证类型不缺项
  return { ...DEFAULT_SETTINGS, ...(raw as Partial<AppSettings>) }
}

/* ---------- 本地缓存（永远可用，接口挂了也不影响用） ---------- */

export function readLocalSnapshot(): SettingsSnapshot | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { settings?: unknown; updatedAt?: unknown }
    return {
      settings: safeMerge(parsed.settings),
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0
    }
  } catch {
    return null
  }
}

/** 写入本地缓存（同步、立即生效），返回写入的快照 */
export function persistLocal(settings: AppSettings, updatedAt = Date.now()): SettingsSnapshot {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ settings, updatedAt }))
  } catch {
    // 隐私模式 / 配额满：忽略，界面照常工作
  }
  return { settings, updatedAt }
}

/** 登出时清除：避免下一个账号继承上一个账号的偏好（也避免 A 的设置在 B 登录时闪一下） */
export function clearLocalSettings(): void {
  localStorage.removeItem(LOCAL_KEY)
  localStorage.removeItem(FIRST_PAINT_CSS_KEY)
}

/* ---------- 远端读写 ---------- */

function authHeaders(): Record<string, string> | null {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

/**
 * 拉云端设置
 *
 * 刻意不走 `getApiResult`：它在 401 时会强制跳登录页，而设置属于「锦上添花」，
 * 登录页 / 会话过期时只应该静默回落到本地，不能把用户踢走。
 * 所有失败（网络断、超时、非 2xx、脏 JSON）统一返回 null，由调用方降级。
 */
async function fetchRemote(): Promise<SettingsSnapshot | null> {
  const headers = authHeaders()
  if (!headers) return null
  try {
    const res = await fetch(API, { headers: { Accept: 'application/json', ...headers } })
    if (!res.ok) return null
    const json = (await res.json()) as { code?: number; success?: boolean; result?: { settings?: unknown; updatedAt?: number | null } }
    if (!(json.success ?? json.code === 0)) return null
    // 服务端从没存过：settings 为 null，交给调用方用本地/默认值
    if (!json.result?.settings) return null
    return { settings: safeMerge(json.result.settings), updatedAt: json.result.updatedAt ?? 0 }
  } catch {
    return null
  }
}

/** 推云端；返回是否成功（失败由调用方决定提示方式，本地副本已在调用前写好） */
export async function pushSettings(settings: AppSettings): Promise<boolean> {
  const headers = authHeaders()
  if (!headers) return false
  try {
    const res = await fetch(API, { method: 'PUT', headers, body: JSON.stringify({ settings }) })
    if (!res.ok) return false
    const json = (await res.json()) as { code?: number; success?: boolean }
    return json.success ?? json.code === 0
  } catch {
    return false
  }
}

/* ---------- 对外：加载 ---------- */

/**
 * 加载设置：本地优先，云端更新则覆盖本地
 *
 * 三种情况：
 * 1. 云端有值且比本地新（换设备 / 清过缓存）→ 用云端并回写本地
 * 2. 云端有值但比本地旧 → 用本地（本机改过还没同步成功，别把用户的改动回滚）
 * 3. 云端没有 / 接口失败 → 本地 → 内置默认值
 *
 * 任何一步失败都不抛错：设置读不到就用默认值，不能因为偏好接口挂了打不开系统。
 */
export async function loadSettings(): Promise<SettingsSnapshot> {
  const local = readLocalSnapshot()
  const remote = await fetchRemote()

  if (remote && (!local || remote.updatedAt >= local.updatedAt)) return persistLocal(remote.settings, remote.updatedAt || Date.now())
  if (local) return local
  return persistLocal({ ...DEFAULT_SETTINGS }, 0)
}
