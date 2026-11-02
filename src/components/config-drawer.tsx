import { useEffect, useState, type ComponentType } from 'react'
import { CircleCheck, Monitor, Moon, RotateCcw, Settings, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useLocale } from '@/context/locale-provider'
import { useSettings } from '@/context/settings-provider'
import { startThemeTransition } from '@/lib/theme'
import type { FontSize } from '@/lib/settings'
import type { TranslationKey } from '@/config/i18n'
import { cn } from '@/lib/utils'

const THEME_OPTIONS: { value: string; labelKey: TranslationKey; icon: ComponentType<{ className?: string }> }[] = [
  { value: 'light', labelKey: 'theme.light', icon: Sun },
  { value: 'dark', labelKey: 'theme.dark', icon: Moon },
  { value: 'system', labelKey: 'theme.system', icon: Monitor }
]

const FONT_SIZE_OPTIONS: { value: FontSize; labelKey: TranslationKey; previewClass: string }[] = [
  { value: 'small', labelKey: 'fontSize.small', previewClass: 'text-xs' },
  { value: 'default', labelKey: 'fontSize.default', previewClass: 'text-sm' },
  { value: 'large', labelKey: 'fontSize.large', previewClass: 'text-base' }
]

export function ConfigDrawer() {
  const { t } = useLocale()
  const { theme, setTheme } = useTheme()
  const { settings, update } = useSettings()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleReset = () => {
    startThemeTransition(() => setTheme('system'))
    update({ fontSize: 'default' })
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" title={t('config.open')}>
          <Settings className="size-4" />
          <span className="sr-only">{t('config.open')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader className="pb-0">
          <SheetTitle>{t('config.title')}</SheetTitle>
          <SheetDescription>{t('config.desc')}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-4">
          {/* 主题 */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-sm font-semibold">{t('config.theme')}</h3>
            <div className="grid grid-cols-3 gap-3">
              {THEME_OPTIONS.map(option => {
                const selected = mounted && theme === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => startThemeTransition(() => setTheme(option.value))}
                    className={cn(
                      'relative flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-xs transition-colors',
                      selected ? 'border-primary ring-primary ring-1' : 'hover:border-muted-foreground/40'
                    )}
                  >
                    {selected && <CircleCheck className="fill-primary stroke-background absolute -top-2 -right-2 size-5" />}
                    <option.icon className="size-5" />
                    {t(option.labelKey)}
                  </button>
                )
              })}
            </div>
          </section>

          {/* 字体大小 */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-sm font-semibold">{t('config.fontSize')}</h3>
            <div className="grid grid-cols-3 gap-3">
              {FONT_SIZE_OPTIONS.map(option => {
                const selected = settings.fontSize === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => update({ fontSize: option.value })}
                    className={cn(
                      'relative flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-xs transition-colors',
                      selected ? 'border-primary ring-primary ring-1' : 'hover:border-muted-foreground/40'
                    )}
                  >
                    {selected && <CircleCheck className="fill-primary stroke-background absolute -top-2 -right-2 size-5" />}
                    <span className={cn(option.previewClass, 'font-semibold')}>A</span>
                    {t(option.labelKey)}
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        <SheetFooter>
          <Button variant="destructive" onClick={handleReset}>
            <RotateCcw className="size-4" />
            {t('config.reset')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
