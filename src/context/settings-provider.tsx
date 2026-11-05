import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type AppSettings, type FontSize } from '@/lib/settings'
import { buildFilterCss, buildThemeColorCss } from '@/lib/theme-presets'

const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: '14px',
  default: '16px',
  large: '18px'
}

const STYLE_ID = 'app-settings-override'

// 主题色与滤镜通过注入的 style 标签生效。首屏由 vite transformIndexHtml 注入同 id 的
// style（内容一致）；注入 CSS 使用 html:root / html.dark 提升优先级，保证不被运行时
// 注入的 index.css（默认变量）按顺序覆盖，刷新首帧即为正确主题色、无闪烁
function applyOverrides(settings: AppSettings) {
  const css = buildThemeColorCss(settings.themeColor, settings.customColor) + buildFilterCss(settings.grayscale, settings.colorWeak)
  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!css) {
    styleEl?.remove()
    return
  }
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = STYLE_ID
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = css
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
    // 初始值已由 index.html 注入的 style 确定（vite transformIndexHtml），
    // 加载完成前不要动样式，避免从默认值跳变闪烁
    if (!loaded) return
    document.documentElement.style.fontSize = FONT_SIZE_MAP[settings.fontSize]
    document.documentElement.dir = settings.direction
    applyOverrides(settings)
    // 初始加载完成后才开启过渡，页面首次渲染不播放动画
    document.documentElement.classList.add('font-size-transition')
  }, [settings, loaded])

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }))
    void saveSettings(patch)
  }, [])

  return <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  return useContext(SettingsContext)
}
