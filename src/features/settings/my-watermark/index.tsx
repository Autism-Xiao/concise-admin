import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocale } from '@/context/locale-provider'
import { useWatermark } from '@/context/watermark-provider'
import type { WatermarkDensity } from '@/lib/watermark'
import type { TranslationKey } from '@/config/i18n'
import { cn } from '@/lib/utils'

const DENSITY_OPTIONS: { value: WatermarkDensity; labelKey: TranslationKey }[] = [
  { value: 'compact', labelKey: 'density.compact' },
  { value: 'default', labelKey: 'density.default' },
  { value: 'loose', labelKey: 'density.loose' }
]

/**
 * 系统设置 · 我的水印
 *
 * 个人水印设置（原在偏好设置抽屉里，收进系统设置统一管理）：
 * 开关/内容/密度由后端按用户下发（PUT /v1/users/me/watermark）。
 * 生效优先级（后端 resolveWatermarkState）：管理员强制/关闭 > 全局模式 > 个人设置，
 * 被锁定时展示后端给的原因文案，样式参数（透明度/角度/字号）只有全局策略能改。
 */
export function MyWatermarkPage() {
  const { t } = useLocale()
  const wm = useWatermark()
  const wmConfig = wm.config
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  // 远端内容变化时同步输入框（自定义内容允许留空 = 跟随全局）
  useEffect(() => {
    if (wmConfig) {
      setContent(wmConfig.custom.content ?? '')
    }
  }, [wmConfig?.custom.content]) // eslint-disable-line react-hooks/exhaustive-deps

  const apply = async (patch: { enabled?: boolean | null; content?: string | null; density?: WatermarkDensity | null }) => {
    try {
      await wm.update(patch)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  /** 被管理员锁定时所有输入都置灰，并展示后端给的原因文案 */
  const locked = wmConfig ? !wmConfig.editable : false
  const effectiveDensity = (wmConfig?.density ?? 'default') as WatermarkDensity

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>我的水印</CardTitle>
        <CardDescription>页面防截图水印的个人设置：开关、内容与密度，保存后立即生效（保存在服务端，跟账号走）</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">{t('config.watermark')}</span>
          <Switch checked={wmConfig?.enabled ?? false} disabled={locked || !wmConfig} onCheckedChange={checked => void apply({ enabled: checked })} />
        </div>
        {wmConfig && locked && <p className="text-muted-foreground text-xs">{wmConfig.reason}</p>}
        {wmConfig?.enabled && !locked && (
          <>
            <div className="space-y-1.5">
              <Input
                value={content}
                onChange={e => setContent(e.target.value)}
                onBlur={() => {
                  if (content !== (wmConfig.custom.content ?? '')) {
                    void apply({ content: content || null })
                  }
                }}
                placeholder={t('config.watermarkContentPlaceholder')}
              />
              <p className="text-muted-foreground text-xs">{t('config.watermarkContentHint')}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('config.watermarkDensity')}</span>
              <div className="bg-muted flex rounded-md p-0.5">
                {DENSITY_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => void apply({ density: option.value })}
                    className={cn(
                      'rounded-sm px-2.5 py-1 text-xs transition-colors',
                      effectiveDensity === option.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {t(option.labelKey)}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-destructive text-xs">{error}</p>}
          </>
        )}
        <p className="text-muted-foreground text-xs">
          注意：管理员强制开启/关闭全站水印时，这里的开关会失效；水印的透明度、角度、字号属于全局策略，仅管理员可在「水印策略」页调整。
        </p>
      </CardContent>
    </Card>
  )
}
