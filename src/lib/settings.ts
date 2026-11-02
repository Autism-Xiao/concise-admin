export type FontSize = 'small' | 'default' | 'large'

export interface AppSettings {
  fontSize: FontSize
}

export const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 'default'
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
