export type FontSize = 'small' | 'default' | 'large'
export type SidebarVariant = 'sidebar' | 'floating' | 'inset'
export type LayoutMode = 'default' | 'compact' | 'offcanvas'
export type Direction = 'ltr' | 'rtl'

export interface AppSettings {
  fontSize: FontSize
  /** 主题色预设名（对应 theme-presets.ts），default 表示跟随默认主题 */
  themeColor: string
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
  /** 全屏安全水印 */
  watermark: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 'default',
  themeColor: 'default',
  grayscale: false,
  colorWeak: false,
  sidebarVariant: 'sidebar',
  layout: 'default',
  direction: 'ltr',
  watermark: false
}

// 开发环境由 vite dev server 插件读写项目根目录 settings.json；
// 生产环境把这两个函数换成真实后端接口即可，调用方无需改动
export async function loadSettings(): Promise<AppSettings> {
  try {
    const res = await fetch('/api/settings')
    if (!res.ok) throw new Error(String(res.status))
    return { ...DEFAULT_SETTINGS, ...(await res.json()) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  })
}
