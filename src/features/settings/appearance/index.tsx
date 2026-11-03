import { useEffect, useState } from 'react'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useSettings } from '@/context/settings-provider'
import { startThemeTransition } from '@/lib/theme'
import { THEME_COLORS } from '@/lib/theme-presets'
import { cn } from '@/lib/utils'

const THEME_OPTIONS = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor }
]

export function AppearancePage() {
  const { theme, setTheme } = useTheme()
  const { settings, update } = useSettings()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="w-full max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>主题</CardTitle>
          <CardDescription>切换浅色 / 深色 / 跟随系统主题</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid max-w-md grid-cols-3 gap-3">
            {THEME_OPTIONS.map(option => {
              const selected = mounted && theme === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => startThemeTransition(() => setTheme(option.value))}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-xs transition-colors',
                    selected ? 'border-primary ring-primary ring-1' : 'hover:border-muted-foreground/40'
                  )}
                >
                  <option.icon className="size-5" />
                  {option.label}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>主题色</CardTitle>
          <CardDescription>选择界面主色调，自动保存到 settings.json</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {THEME_COLORS.map(color => {
              const selected = settings.themeColor === color.name
              return (
                <button
                  key={color.name}
                  type="button"
                  title={color.label}
                  aria-label={color.label}
                  onClick={() => update({ themeColor: color.name })}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full transition-transform hover:scale-110',
                    selected && 'ring-primary ring-offset-background ring-2 ring-offset-2'
                  )}
                  style={{ backgroundColor: color.swatch }}
                >
                  {selected && <Check className="size-4 text-white" />}
                </button>
              )
            })}
            {/* 自定义颜色：未选中时显示彩虹圈，选中后显示所选颜色 */}
            <label
              title="自定义"
              aria-label="自定义"
              className={cn(
                'relative flex size-7 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110',
                settings.themeColor === 'custom' && 'ring-primary ring-offset-background ring-2 ring-offset-2'
              )}
              style={{
                backgroundColor: settings.themeColor === 'custom' ? settings.customColor : undefined,
                backgroundImage: settings.themeColor === 'custom' ? undefined : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)'
              }}
            >
              {settings.themeColor === 'custom' && <Check className="size-4 text-white" />}
              <input
                type="color"
                className="absolute inset-0 size-full cursor-pointer opacity-0"
                value={settings.customColor}
                onChange={e => update({ themeColor: 'custom', customColor: e.target.value })}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>界面设置</CardTitle>
          <CardDescription>辅助显示选项</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">灰色模式</span>
            <Switch checked={settings.grayscale} onCheckedChange={checked => update({ grayscale: checked })} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">色弱模式</span>
            <Switch checked={settings.colorWeak} onCheckedChange={checked => update({ colorWeak: checked })} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
