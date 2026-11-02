import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { Check, CircleCheck, Monitor, Moon, RotateCcw, Settings, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { useLocale } from '@/context/locale-provider'
import { useSettings } from '@/context/settings-provider'
import { startThemeTransition } from '@/lib/theme'
import { THEME_COLORS } from '@/lib/theme-presets'
import type { Direction, FontSize, LayoutMode, SidebarVariant, WatermarkDensity } from '@/lib/settings'
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

const WATERMARK_DENSITIES: { value: WatermarkDensity; labelKey: TranslationKey }[] = [
  { value: 'compact', labelKey: 'density.compact' },
  { value: 'default', labelKey: 'density.default' },
  { value: 'loose', labelKey: 'density.loose' }
]

// 带缩略图的选择卡片
function ThumbCard({ selected, onClick, label, children }: { selected: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="relative flex flex-col items-center gap-1.5 text-xs">
      {selected && <CircleCheck className="fill-primary stroke-background absolute -top-2 -right-2 z-10 size-5" />}
      <div
        className={cn(
          'bg-muted/40 relative h-16 w-full rounded-md border p-1.5 transition-colors',
          selected ? 'border-primary ring-primary ring-1' : 'hover:border-muted-foreground/40'
        )}
      >
        {children}
      </div>
      {label}
    </button>
  )
}

// 迷你窗口外框：带标题栏，让缩略图读起来像一个真实应用
function MiniWindow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('bg-background flex h-full flex-col overflow-hidden rounded-sm border shadow-sm', className)}>
      <div className="border-border/60 flex h-2 shrink-0 items-center gap-0.5 border-b px-1">
        <span className="bg-foreground/25 size-0.5 rounded-full" />
        <span className="bg-foreground/25 size-0.5 rounded-full" />
        <span className="bg-foreground/25 size-0.5 rounded-full" />
      </div>
      <div className="relative flex flex-1 overflow-hidden">{children}</div>
    </div>
  )
}

// 侧栏内容：logo 点 + 菜单线
function SidebarLines() {
  return (
    <div className="flex h-full w-full flex-col gap-[3px] p-1">
      <span className="bg-primary size-1 shrink-0 rounded-full" />
      <span className="bg-foreground/30 h-[2px] w-3/4 shrink-0 rounded-full" />
      <span className="bg-foreground/20 h-[2px] w-2/3 shrink-0 rounded-full" />
      <span className="bg-foreground/20 h-[2px] w-1/2 shrink-0 rounded-full" />
    </div>
  )
}

// 内容区：标题线 + 卡片块
function ContentBlock() {
  return (
    <div className="flex h-full w-full flex-col gap-1 p-1">
      <span className="bg-foreground/25 h-[2px] w-1/3 shrink-0 rounded-full" />
      <span className="bg-foreground/10 border-border/40 w-full flex-1 rounded-[2px] border" />
    </div>
  )
}

function SidebarThumb({ variant }: { variant: SidebarVariant }) {
  if (variant === 'floating') {
    return (
      <MiniWindow className="bg-muted/50">
        <div className="h-full w-2/5 p-1">
          <div className="bg-foreground/20 h-full w-full rounded-[3px] shadow-sm">
            <SidebarLines />
          </div>
        </div>
        <div className="h-full flex-1 py-1 pr-1">
          <ContentBlock />
        </div>
      </MiniWindow>
    )
  }
  if (variant === 'inset') {
    return (
      <MiniWindow className="bg-foreground/10">
        <div className="h-full w-1/4">
          <SidebarLines />
        </div>
        <div className="h-full flex-1 p-1">
          <div className="bg-background h-full w-full rounded-[3px] border shadow-sm">
            <ContentBlock />
          </div>
        </div>
      </MiniWindow>
    )
  }
  return (
    <MiniWindow>
      <div className="bg-foreground/15 h-full w-1/4">
        <SidebarLines />
      </div>
      <div className="h-full flex-1">
        <ContentBlock />
      </div>
    </MiniWindow>
  )
}

function LayoutThumb({ layout }: { layout: LayoutMode }) {
  if (layout === 'compact') {
    return (
      <MiniWindow>
        <div className="bg-foreground/15 flex h-full w-2.5 flex-col items-center gap-[3px] py-1">
          <span className="bg-primary size-1 shrink-0 rounded-full" />
          <span className="bg-foreground/30 size-0.5 shrink-0 rounded-full" />
          <span className="bg-foreground/30 size-0.5 shrink-0 rounded-full" />
          <span className="bg-foreground/30 size-0.5 shrink-0 rounded-full" />
        </div>
        <div className="h-full flex-1">
          <ContentBlock />
        </div>
      </MiniWindow>
    )
  }
  if (layout === 'offcanvas') {
    return (
      <MiniWindow>
        <div className="h-full w-full p-1">
          <div className="bg-primary flex size-2.5 flex-col items-center justify-center gap-px rounded-[2px]">
            <span className="bg-primary-foreground h-px w-1.5 rounded-full" />
            <span className="bg-primary-foreground h-px w-1.5 rounded-full" />
            <span className="bg-primary-foreground h-px w-1.5 rounded-full" />
          </div>
        </div>
      </MiniWindow>
    )
  }
  return (
    <MiniWindow>
      <div className="bg-foreground/15 h-full w-1/4">
        <SidebarLines />
      </div>
      <div className="h-full flex-1">
        <ContentBlock />
      </div>
    </MiniWindow>
  )
}

function DirectionThumb({ dir }: { dir: Direction }) {
  const align = dir === 'ltr' ? 'items-start' : 'items-end'
  return (
    <MiniWindow>
      <div className={cn('flex h-full w-full flex-col justify-center gap-[3px] px-1.5', align)}>
        <span className="bg-primary/70 h-[2px] w-3/4 rounded-full" />
        <span className="bg-foreground/25 h-[2px] w-1/2 rounded-full" />
        <span className="bg-foreground/25 h-[2px] w-2/3 rounded-full" />
      </div>
    </MiniWindow>
  )
}

export function ConfigDrawer() {
  const { t } = useLocale()
  const { theme, setTheme, resolvedTheme } = useTheme()
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
      watermark: false,
      watermarkDensity: 'default'
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
                // 色板跟随当前明暗模式展示（默认色在深色下显示为浅色圆点）
                const swatch = mounted && resolvedTheme === 'dark' ? (color.swatchDark ?? color.swatch) : color.swatch
                const lightSwatch = mounted && resolvedTheme === 'dark' && !!color.swatchDark
                return (
                  <button
                    key={color.name}
                    type="button"
                    title={color.label}
                    aria-label={color.label}
                    onClick={() => update({ themeColor: color.name })}
                    className={cn(
                      'flex size-7 items-center justify-center rounded-full border border-black/10 transition-transform hover:scale-110 dark:border-white/20',
                      selected && 'ring-primary ring-offset-background ring-2 ring-offset-2'
                    )}
                    style={{ backgroundColor: swatch }}
                  >
                    {selected && <Check className={cn('size-4', lightSwatch ? 'text-black' : 'text-white')} />}
                  </button>
                )
              })}
              {/* 自定义颜色：未选中时显示彩虹圈，选中后显示所选颜色 */}
              <label
                title="自定义"
                aria-label="自定义"
                className={cn(
                  'relative flex size-7 cursor-pointer items-center justify-center rounded-full border border-black/10 transition-transform hover:scale-110 dark:border-white/20',
                  settings.themeColor === 'custom' && 'ring-primary ring-offset-background ring-2 ring-offset-2'
                )}
                style={{
                  backgroundColor: settings.themeColor === 'custom' ? settings.customColor : undefined,
                  backgroundImage:
                    settings.themeColor === 'custom'
                      ? undefined
                      : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)'
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
              {settings.watermark && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Input
                      value={settings.watermarkContent}
                      onChange={e => update({ watermarkContent: e.target.value })}
                      placeholder={t('config.watermarkContentPlaceholder')}
                    />
                    <p className="text-muted-foreground text-xs">{t('config.watermarkContentHint')}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('config.watermarkDensity')}</span>
                    <div className="bg-muted flex rounded-md p-0.5">
                      {WATERMARK_DENSITIES.map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => update({ watermarkDensity: option.value })}
                          className={cn(
                            'rounded-sm px-2.5 py-1 text-xs transition-colors',
                            settings.watermarkDensity === option.value
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {t(option.labelKey)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
