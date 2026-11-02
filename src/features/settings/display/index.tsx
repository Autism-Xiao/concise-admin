import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSettings } from '@/context/settings-provider'
import { cn } from '@/lib/utils'
import type { FontSize } from '@/lib/settings'

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; previewClass: string }[] = [
  { value: 'small', label: '紧凑', previewClass: 'text-sm' },
  { value: 'default', label: '默认', previewClass: 'text-base' },
  { value: 'large', label: '宽松', previewClass: 'text-lg' }
]

export function DisplayPage() {
  const { settings, update } = useSettings()

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>字体大小</CardTitle>
        <CardDescription>调整后即时生效，自动保存到项目根目录 settings.json</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid max-w-md grid-cols-3 gap-3">
          {FONT_SIZE_OPTIONS.map(option => {
            const selected = settings.fontSize === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => update({ fontSize: option.value })}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-xs transition-colors',
                  selected ? 'border-primary ring-primary ring-1' : 'hover:border-muted-foreground/40'
                )}
              >
                <span className={cn(option.previewClass, 'font-semibold')}>A</span>
                {option.label}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
