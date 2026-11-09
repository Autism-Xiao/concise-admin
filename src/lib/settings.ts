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

/**
 * 设置快照
 *
 * `dirty` 是「本地有未推送成功的修改」的标记，靠它决定加载时用本地还是云端。
 * **刻意不再用「谁的时间戳更大」判断**：本地时间来自客户端时钟、云端时间来自服务端时钟，
 * 两者不可比 —— 机器时钟偏快时（实测偏差几十分钟很常见）云端的新值会被误判成旧值而被忽略。
 * `updatedAt` 保留只为诊断与首帧缓存，不参与任何比较。
 */
export interface SettingsSnapshot {
  settings: AppSettings
  updatedAt: number
  /** 本地修改尚未成功推送（离线 / 接口失败）；true 时加载以本地为准 */
  dirty?: boolean
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
    const parsed = JSON.parse(raw) as { settings?: unknown; updatedAt?: unknown; dirty?: unknown }
    return {
      settings: safeMerge(parsed.settings),
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
      // 老版本快照没有 dirty 字段：按「已同步」处理（否则老用户会永远压着云端不更新）
      dirty: parsed.dirty === true
    }
  } catch {
    return null
  }
}

/**
 * 写入本地缓存（同步、立即生效）
 *
 * `dirty` 默认 true —— 本函数绝大多数调用来自「用户改了设置」，此时尚未推送成功。
 * 从云端回写本地时必须显式传 false，否则下次加载会把云端当成「本地未同步」而拒绝更新。
 */
export function persistLocal(settings: AppSettings, updatedAt = Date.now(), dirty = true): SettingsSnapshot {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ settings, updatedAt, dirty }))
  } catch {
    // 隐私模式 / 配额满：忽略，界面照常工作
  }
  return { settings, updatedAt, dirty }
}

/**
 * 推送成功后调用：把本地标记为「已同步」，下次加载重新以云端为准
 *
 * 带内容比对：推送是异步的，回调到达时用户可能已经又改了一版（本地是新内容 + dirty=true）。
 * 那种情况下不能把旧内容写回去，也不能清掉 dirty —— 否则新改动会被当作「已同步」而永不重推。
 */
export function markSynced(settings: AppSettings): void {
  const local = readLocalSnapshot()
  if (!local || JSON.stringify(local.settings) !== JSON.stringify(settings)) return
  persistLocal(local.settings, Date.now(), false)
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
    // 后端已用服务端默认值补齐，正常一定拿得到完整对象；`!settings` 只是防御老版本后端/异常响应
    if (!json.result?.settings) return null
    // updatedAt 为 null 表示该账号从未改过设置（后端空行），按 0 处理：本地没有改动时就用服务端值
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
 * 加载设置：本地有未同步改动则以本地为准，否则以云端为准
 *
 * 判定顺序（不再比较时间戳，见 SettingsSnapshot 注释）：
 * 1. 本地 `dirty`（改了但没推成功）→ 用本地，不能让服务端旧值把用户的改动回滚；界面会显示「未同步」
 * 2. 云端有值 → 用云端并回写本地（dirty=false）：换设备、清过缓存、多端修改都以服务端为准
 * 3. 云端读不到 / 未登录 → 本地 → 内置默认值
 *
 * 任何一步失败都不抛错：设置读不到就用默认值，不能因为偏好接口挂了打不开系统。
 */
export async function loadSettings(): Promise<SettingsSnapshot> {
  const local = readLocalSnapshot()
  const remote = await fetchRemote()

  if (local?.dirty) return local
  // 回写时 dirty 必须为 false —— 这是「云端值已落地本地」的事实，不是用户改动
  if (remote) return persistLocal(remote.settings, remote.updatedAt, false)
  if (local) return local
  return persistLocal({ ...DEFAULT_SETTINGS }, 0, false)
}
