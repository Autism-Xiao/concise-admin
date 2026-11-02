import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { useSettings } from '@/context/settings-provider'
import { cn } from '@/lib/utils'
import type { FontSize } from '@/lib/settings'

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; preview: string }[] = [
  { value: 'small', label: '紧凑', preview: 'A' },
  { value: 'default', label: '默认', preview: 'A' },
  { value: 'large', label: '宽松', preview: 'A' }
]

const FONT_SIZE_PREVIEW_CLASS: Record<FontSize, string> = {
  small: 'text-sm',
  default: 'text-base',
  large: 'text-lg'
}

export function SettingsPage() {
  const { settings, update } = useSettings()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">系统设置</h1>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>外观</CardTitle>
          <CardDescription>切换浅色 / 深色 / 跟随系统主题</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>字体大小</CardTitle>
          <CardDescription>调整后即时生效，自动保存到项目根目录 settings.json</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          {FONT_SIZE_OPTIONS.map(option => (
            <Button
              key={option.value}
              variant={settings.fontSize === option.value ? 'default' : 'outline'}
              className="h-auto flex-1 flex-col gap-1 py-3"
              onClick={() => update({ fontSize: option.value })}
            >
              <span className={cn(FONT_SIZE_PREVIEW_CLASS[option.value], 'font-semibold')}>{option.preview}</span>
              <span className="text-xs">{option.label}</span>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
