import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { Check, CircleCheck, Monitor, Moon, RotateCcw, Settings, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { useLocale } from '@/context/locale-provider'
import { useSettings } from '@/context/settings-provider'
import { startThemeTransition } from '@/lib/theme'
import { THEME_COLORS } from '@/lib/theme-presets'
import type { Direction, FontSize, LayoutMode, SidebarVariant } from '@/lib/settings'
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

const SIDEBAR_VARIANTS: { value: SidebarVariant; labelKey: TranslationKey }[] = [
  { value: 'sidebar', labelKey: 'sidebar.sidebar' },
  { value: 'floating', labelKey: 'sidebar.floating' },
  { value: 'inset', labelKey: 'sidebar.inset' }
]

const LAYOUT_MODES: { value: LayoutMode; labelKey: TranslationKey }[] = [
  { value: 'default', labelKey: 'layout.default' },
  { value: 'compact', labelKey: 'layout.compact' },
  { value: 'offcanvas', labelKey: 'layout.offcanvas' }
]

const DIRECTIONS: { value: Direction; labelKey: TranslationKey }[] = [
  { value: 'ltr', labelKey: 'direction.ltr' },
  { value: 'rtl', labelKey: 'direction.rtl' }
]

// 带缩略图的选择卡片
function ThumbCard({ selected, onClick, label, children }: { selected: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="relative flex flex-col items-center gap-1.5 text-xs">
      {selected && <CircleCheck className="fill-primary stroke-background absolute -top-2 -right-2 z-10 size-5" />}
      <div
        className={cn(
          'bg-muted/40 relative h-16 w-full overflow-hidden rounded-md border transition-colors',
          selected ? 'border-primary ring-primary ring-1' : 'hover:border-muted-foreground/40'
        )}
      >
        {children}
      </div>
      {label}
    </button>
  )
}

function SidebarThumb({ variant }: { variant: SidebarVariant }) {
  if (variant === 'floating') {
    return (
      <div className="flex h-full p-1.5">
        <div className="bg-foreground/25 w-1/4 rounded-sm" />
        <div className="flex-1" />
      </div>
    )
  }
  if (variant === 'inset') {
    return (
      <div className="bg-foreground/15 flex h-full p-1.5">
        <div className="w-1/4" />
        <div className="bg-background flex-1 rounded-sm shadow-sm" />
      </div>
    )
  }
  return (
    <div className="flex h-full">
      <div className="bg-foreground/25 w-1/4" />
      <div className="flex-1" />
    </div>
  )
}

function LayoutThumb({ layout }: { layout: LayoutMode }) {
  if (layout === 'compact') {
    return (
      <div className="flex h-full">
        <div className="bg-foreground/25 w-2" />
        <div className="flex-1" />
      </div>
    )
  }
  if (layout === 'offcanvas') {
    return (
      <div className="relative h-full">
        <div className="absolute start-1.5 top-1.5 space-y-0.5">
          <div className="bg-foreground/40 h-0.5 w-3 rounded-full" />
          <div className="bg-foreground/40 h-0.5 w-3 rounded-full" />
          <div className="bg-foreground/40 h-0.5 w-3 rounded-full" />
        </div>
      </div>
    )
  }
  return (
    <div className="flex h-full">
      <div className="bg-foreground/25 w-1/4" />
      <div className="flex-1" />
    </div>
  )
}

function DirectionThumb({ dir }: { dir: Direction }) {
  const align = dir === 'ltr' ? 'items-start' : 'items-end'
  return (
    <div className={cn('flex h-full flex-col justify-center gap-1 px-2', align)}>
      <div className="bg-foreground/40 h-1 w-3/4 rounded-full" />
      <div className="bg-foreground/40 h-1 w-1/2 rounded-full" />
      <div className="bg-foreground/40 h-1 w-2/3 rounded-full" />
    </div>
  )
}

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
    update({
      fontSize: 'default',
      themeColor: 'default',
      grayscale: false,
      colorWeak: false,
      sidebarVariant: 'sidebar',
      layout: 'default',
      direction: 'ltr',
      watermark: false
    })
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

          {/* 主题色 */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-sm font-semibold">{t('config.color')}</h3>
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
            </div>
          </section>

          {/* 侧边栏 */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-sm font-semibold">{t('config.sidebar')}</h3>
            <div className="grid grid-cols-3 gap-3">
              {SIDEBAR_VARIANTS.map(option => (
                <ThumbCard
                  key={option.value}
                  selected={settings.sidebarVariant === option.value}
                  onClick={() => update({ sidebarVariant: option.value })}
                  label={t(option.labelKey)}
                >
                  <SidebarThumb variant={option.value} />
                </ThumbCard>
              ))}
            </div>
          </section>

          {/* 布局 */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-sm font-semibold">{t('config.layout')}</h3>
            <div className="grid grid-cols-3 gap-3">
              {LAYOUT_MODES.map(option => (
                <ThumbCard
                  key={option.value}
                  selected={settings.layout === option.value}
                  onClick={() => update({ layout: option.value })}
                  label={t(option.labelKey)}
                >
                  <LayoutThumb layout={option.value} />
                </ThumbCard>
              ))}
            </div>
          </section>

          {/* 文字方向 */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-sm font-semibold">{t('config.direction')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {DIRECTIONS.map(option => (
                <ThumbCard
                  key={option.value}
                  selected={settings.direction === option.value}
                  onClick={() => update({ direction: option.value })}
                  label={t(option.labelKey)}
                >
                  <DirectionThumb dir={option.value} />
                </ThumbCard>
              ))}
            </div>
          </section>

          {/* 界面设置 */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-sm font-semibold">{t('config.interface')}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">{t('config.grayscale')}</span>
                <Switch checked={settings.grayscale} onCheckedChange={checked => update({ grayscale: checked })} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t('config.colorWeak')}</span>
                <Switch checked={settings.colorWeak} onCheckedChange={checked => update({ colorWeak: checked })} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t('config.watermark')}</span>
                <Switch checked={settings.watermark} onCheckedChange={checked => update({ watermark: checked })} />
              </div>
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
