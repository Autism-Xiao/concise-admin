import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { hasPermission } from '@/lib/auth'
import { fetchWatermarkSetting, updateWatermarkSetting, type WatermarkMode } from '@/lib/watermark'

const MODE_LABELS: Record<WatermarkMode, string> = {
  optional: '用户可自选（默认按全局开关，用户可覆盖）',
  forced: '全站强制开启（用户无法关闭）',
  off: '全站关闭（所有人无水印）'
}

/** 全局水印策略：默认开关、默认文案与样式参数只有这里能改，用户侧样式不可覆盖 */
export function WatermarkSettingPage() {
  const [setting, setSetting] = useState<Awaited<ReturnType<typeof fetchWatermarkSetting>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const editable = hasPermission('system:watermark:edit')

  const load = () => {
    setError(null)
    fetchWatermarkSetting()
      .then(setSetting)
      .catch(e => setError(e instanceof Error ? e.message : '加载失败'))
  }

  useEffect(load, [])

  if (error) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>水印策略</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button variant="outline" onClick={load}>
            重试
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!setting) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="space-y-3 py-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    )
  }

  const save = async (patch: Parameters<typeof updateWatermarkSetting>[0]) => {
    setSaving(true)
    try {
      const next = await updateWatermarkSetting(patch)
      setSetting(next)
      toast.success('水印策略已保存')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>水印策略</CardTitle>
        <CardDescription>
          全局默认值只影响「未单独设置」的用户；需要给某个人单独开关时，去「用户管理」行内水印按钮设置。
          {!editable && ' 当前账号没有修改权限（需 system:watermark:edit）。'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="wm-global-enabled">默认开启水印</Label>
            <p className="text-muted-foreground text-xs">关闭后全站无水印（等同模式=off）；开启时按下方模式生效</p>
          </div>
          <Switch
            id="wm-global-enabled"
            checked={setting.enabled === 1}
            disabled={!editable || saving}
            onCheckedChange={checked => void save({ enabled: checked })}
          />
        </div>

        <div className="space-y-1.5">
          <Label>管控模式</Label>
          <Select value={setting.mode} disabled={!editable || saving} onValueChange={value => void save({ mode: value as WatermarkMode })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(MODE_LABELS) as WatermarkMode[]).map(mode => (
                <SelectItem key={mode} value={mode}>
                  {MODE_LABELS[mode]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">「默认开启」与「管控模式」互相联动：关闭开关会自动切到 off，切离 off 会自动打开开关</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wm-global-content">默认水印内容</Label>
          <Input
            id="wm-global-content"
            defaultValue={setting.content}
            disabled={!editable || saving}
            onBlur={e => {
              const value = e.target.value.trim()
              if (value && value !== setting.content) {
                void save({ content: value })
              }
            }}
            maxLength={200}
          />
          <p className="text-muted-foreground text-xs">
            支持 {'{username} {nickname} {dept} {ip} {date} {time}'}，竖线或换行分隔多行；改完失焦保存，仅影响未自定义的用户
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="wm-opacity">不透明度 %</Label>
            <Input
              id="wm-opacity"
              type="number"
              min={4}
              max={30}
              defaultValue={setting.opacity}
              disabled={!editable || saving}
              onBlur={e => {
                const value = Number(e.target.value)
                if (Number.isInteger(value) && value !== setting.opacity) void save({ opacity: value })
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wm-rotate">倾斜角度</Label>
            <Input
              id="wm-rotate"
              type="number"
              min={-60}
              max={0}
              defaultValue={setting.rotate}
              disabled={!editable || saving}
              onBlur={e => {
                const value = Number(e.target.value)
                if (Number.isInteger(value) && value !== setting.rotate) void save({ rotate: value })
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wm-font">字号 px</Label>
            <Input
              id="wm-font"
              type="number"
              min={10}
              max={24}
              defaultValue={setting.fontSize}
              disabled={!editable || saving}
              onBlur={e => {
                const value = Number(e.target.value)
                if (Number.isInteger(value) && value !== setting.fontSize) void save({ fontSize: value })
              }}
            />
          </div>
        </div>
        <p className="text-muted-foreground text-xs">不透明度下限 4%：再低就形同虚设；样式参数对所有用户统一生效，用户无法自行调整</p>
      </CardContent>
    </Card>
  )
}
