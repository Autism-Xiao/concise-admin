import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type AppSettings, type FontSize } from '@/lib/settings'

const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: '14px',
  default: '16px',
  large: '18px'
}

interface SettingsContextValue {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  update: () => undefined
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadSettings().then(data => {
      if (!cancelled) {
        setSettings(data)
        setLoaded(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    // 初始字号已由 index.html 注入的 style 确定（vite transformIndexHtml），
    // 加载完成前不要动根字号，避免从默认值跳变闪烁
    if (!loaded) return
    document.documentElement.style.fontSize = FONT_SIZE_MAP[settings.fontSize]
    // 初始加载完成后才开启过渡，页面首次渲染不播放动画
    document.documentElement.classList.add('font-size-transition')
  }, [settings.fontSize, loaded])

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }))
    void saveSettings(patch)
  }, [])

  return <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  return useContext(SettingsContext)
}
