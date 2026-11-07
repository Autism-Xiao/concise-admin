import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AUTH_CHANGED_EVENT, getAccessToken } from '@/lib/auth'
import {
  DEFAULT_SETTINGS,
  FIRST_PAINT_CSS_KEY,
  loadSettings,
  persistLocal,
  pushSettings,
  readLocalSnapshot,
  type AppSettings,
  type FontSize
} from '@/lib/settings'
import { buildFilterCss, buildThemeColorCss } from '@/lib/theme-presets'

const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: '14px',
  default: '16px',
  large: '18px'
}

const STYLE_ID = 'app-settings-override'
/** 连续拖动字号/取色时合并请求，避免每动一下就 PUT 一次 */
const SYNC_DELAY_MS = 400

/** 云端同步状态：synced 已同步 / pending 保存中 / local 仅本机（接口不可用，已本地兜底） */
export type SettingsSyncState = 'synced' | 'pending' | 'local'

/** 首帧样式：字号 + 主题色变量 + 滤镜，与 vite transformIndexHtml 注入的内容保持同构 */
function buildOverrideCss(settings: AppSettings): string {
  return (
    `html{font-size:${FONT_SIZE_MAP[settings.fontSize]}}` +
    buildThemeColorCss(settings.themeColor, settings.customColor) +
    buildFilterCss(settings.grayscale, settings.colorWeak)
  )
}

// 主题色与滤镜通过注入的 style 标签生效。首屏由 vite transformIndexHtml 注入同 id 的
// style（内容一致）；注入 CSS 使用 html:root / html.dark 提升优先级，保证不被运行时
// 注入的 index.css（默认变量）按顺序覆盖，刷新首帧即为正确主题色、无闪烁
function applyOverrides(settings: AppSettings) {
  const css = buildOverrideCss(settings)
  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = STYLE_ID
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = css
  // 缓存下来给 index.html 的内联脚本用：下次刷新在 React 起来之前就能套上正确样式，
  // 否则「服务端默认 → 本地缓存」之间会闪一下
  try {
    localStorage.setItem(FIRST_PAINT_CSS_KEY, css)
  } catch {
    // 忽略配额/隐私模式
  }
}

interface SettingsContextValue {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
  syncState: SettingsSyncState
  /** 手动重试同步（设置页「重试」用） */
  retrySync: () => void
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  update: () => undefined,
  syncState: 'synced',
  retrySync: () => undefined
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  // 首帧直接用本地缓存：命中时连一次加载闪烁都没有，且离线可用
  const [initial] = useState(() => readLocalSnapshot())
  const [settings, setSettings] = useState<AppSettings>(initial?.settings ?? DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(initial !== null)
  const [syncState, setSyncState] = useState<SettingsSyncState>('synced')

  const settingsRef = useRef(settings)
  // 用户在加载完成前就改过设置时，不再用云端结果覆盖他刚做的选择
  const dirtyRef = useRef(false)
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    let cancelled = false
    loadSettings().then(snapshot => {
      if (cancelled) return
      if (!dirtyRef.current) {
        settingsRef.current = snapshot.settings
        setSettings(snapshot.settings)
      }
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // 登录 / 登出后重新对齐云端
  //
  // Provider 挂在 __root 上不会卸载，而登录是 navigate() 不是整页刷新，
  // 所以「挂载时拉一次」不足以覆盖登录后的场景（换设备登录会看不到自己的主题色）。
  // 登出时本地偏好已被 clearLocalSettings() 清掉，这里把界面恢复成默认值，且不写回本地。
  useEffect(() => {
    let cancelled = false
    const onAuthChanged = () => {
      // 换了账号：上一个账号的「已改动」标记不再有意义
      dirtyRef.current = false
      if (syncTimer.current) clearTimeout(syncTimer.current)

      if (!getAccessToken()) {
        settingsRef.current = { ...DEFAULT_SETTINGS }
        setSettings({ ...DEFAULT_SETTINGS })
        setSyncState('synced')
        return
      }
      loadSettings().then(snapshot => {
        if (cancelled) return
        settingsRef.current = snapshot.settings
        setSettings(snapshot.settings)
        setSyncState('synced')
      })
    }
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged)
    return () => {
      cancelled = true
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged)
    }
  }, [])

  useEffect(
    () => () => {
      if (syncTimer.current) clearTimeout(syncTimer.current)
    },
    []
  )

  useEffect(() => {
    // 初始值已由本地缓存（或 index.html 注入的 style）确定，加载完成前不要动样式，避免跳变
    if (!loaded) return
    document.documentElement.style.fontSize = FONT_SIZE_MAP[settings.fontSize]
    document.documentElement.dir = settings.direction
    applyOverrides(settings)
    // 初始加载完成后才开启过渡，页面首次渲染不播放动画
    document.documentElement.classList.add('font-size-transition')
  }, [settings, loaded])

  const update = useCallback((patch: Partial<AppSettings>) => {
    dirtyRef.current = true
    const next = { ...settingsRef.current, ...patch }
    settingsRef.current = next
    setSettings(next)
    // 先落本地：接口挂了也不丢，用户立刻看到效果
    persistLocal(next)
    setSyncState('pending')
    if (syncTimer.current) clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => {
      void pushSettings(next).then(ok => setSyncState(ok ? 'synced' : 'local'))
    }, SYNC_DELAY_MS)
  }, [])

  const retrySync = useCallback(() => {
    setSyncState('pending')
    void pushSettings(settingsRef.current).then(ok => setSyncState(ok ? 'synced' : 'local'))
  }, [])

  return <SettingsContext.Provider value={{ settings, update, syncState, retrySync }}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  return useContext(SettingsContext)
}
