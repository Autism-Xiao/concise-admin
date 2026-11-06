import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { updateUserWatermark, type User, type UserWatermarkPatch, type WatermarkDensity } from '../api'

interface UserWatermarkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  /** 保存成功后回调（刷新列表拿最新摘要） */
  onSaved: () => void
}

const ENFORCED_LABELS: Record<number, string> = {
  0: '按全局策略（用户可自行开关）',
  1: '强制开启（用户关不掉）',
  2: '强制关闭（用户开不了）'
}

/**
 * 管理员给单个用户设置水印
 *
 * 列表只带回 enabled/enforced 摘要，content/density 不展示原始值：
 * 留空提交 = 跟随全局，改了才覆盖 —— 与后端 NULL 语义一致，也避免误以为空输入是"清空用户配置"。
 */
export function UserWatermarkDialog({ open, onOpenChange, user, onSaved }: UserWatermarkDialogProps) {
  const [enabled, setEnabled] = useState(true)
  const [enforced, setEnforced] = useState<number>(0)
  const [content, setContent] = useState('')
  const [density, setDensity] = useState<WatermarkDensity | 'inherit'>('inherit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setEnabled(user.watermarkEffective ?? true)
      setEnforced(user.watermarkEnforced ?? 0)
      setContent('')
      setDensity('inherit')
      setError(null)
    }
  }, [user])

  if (!user) return null

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const patch: UserWatermarkPatch = {
        enabled,
        enforced: enforced as 0 | 1 | 2,
        content: content.trim() || null,
        density: density === 'inherit' ? null : density
      }
      await updateUserWatermark(user.id, patch)
      onSaved()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>水印设置 · {user.realname || user.username}</DialogTitle>
          <DialogDescription>该用户当前水印状态：{user.watermarkEffective ? '已开启' : '已关闭'}。留空的内容与密度将跟随全局策略。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="wm-enabled">开启水印</Label>
            <Switch id="wm-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-1.5">
            <Label>管控方式</Label>
            <Select value={String(enforced)} items={{ 0: '按全局策略', 1: '强制开启', 2: '强制关闭' }} onValueChange={value => setEnforced(Number(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2].map(value => (
                  <SelectItem key={value} value={String(value)}>
                    {ENFORCED_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wm-content">水印内容（留空跟随全局）</Label>
            <Input
              id="wm-content"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="如：研发部·{nickname}（支持 {username} {dept} {date} {time}）"
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label>密度（留空跟随全局）</Label>
            <Select value={density} items={{ inherit: '跟随全局', compact: '紧凑', default: '标准', loose: '宽松' }} onValueChange={value => setDensity(value as WatermarkDensity | 'inherit')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit">跟随全局</SelectItem>
                <SelectItem value="compact">紧凑</SelectItem>
                <SelectItem value="default">标准</SelectItem>
                <SelectItem value="loose">宽松</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
