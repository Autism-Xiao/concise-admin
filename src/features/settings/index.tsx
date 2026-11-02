import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { useLocale } from '@/context/locale-provider'
import { useSettings } from '@/context/settings-provider'
import { cn } from '@/lib/utils'
import type { FontSize } from '@/lib/settings'
import type { TranslationKey } from '@/config/i18n'

const FONT_SIZE_OPTIONS: { value: FontSize; labelKey: TranslationKey; preview: string }[] = [
  { value: 'small', labelKey: 'fontSize.small', preview: 'A' },
  { value: 'default', labelKey: 'fontSize.default', preview: 'A' },
  { value: 'large', labelKey: 'fontSize.large', preview: 'A' }
]

const FONT_SIZE_PREVIEW_CLASS: Record<FontSize, string> = {
  small: 'text-sm',
  default: 'text-base',
  large: 'text-lg'
}

export function SettingsPage() {
  const { settings, update } = useSettings()
  const { t } = useLocale()

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
              <span className="text-xs">{t(option.labelKey)}</span>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
