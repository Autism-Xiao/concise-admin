import { useEffect, useState } from 'react'
import { Droplets, ShieldCheck, ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { BatchWatermarkMode, User } from '../api'

interface BatchWatermarkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 勾选的目标用户（用于标题里的数量与当前状态统计） */
  targets: User[]
  /** 提交：对勾选用户统一套用同一档水印动作 */
  onSubmit: (ids: string[], mode: BatchWatermarkMode) => Promise<void>
}

/** 动作的中文名（toast 与按钮复用，改文案只改这一处） */
export const BATCH_WATERMARK_MODE_LABEL: Record<BatchWatermarkMode, string> = {
  on: '开启水印',
  off: '关闭水印',
  inherit: '恢复跟随全局'
}

interface ModeOption {
  value: BatchWatermarkMode
  label: string
  desc: string
  icon: typeof Droplets
  /** 危险动作（关闭水印）用红色提示 */
  danger?: boolean
}

const MODE_OPTIONS: ModeOption[] = [
  {
    value: 'on',
    label: '开启水印（强制开启）',
    desc: '即便全局策略关闭，这些用户也显示水印；用户自己关不掉。',
    icon: ShieldCheck
  },
  {
    value: 'off',
    label: '关闭水印（强制关闭）',
    desc: '即便全局策略强制开启，这些用户也不显示水印；用户自己开不了。',
    icon: ShieldOff,
    danger: true
  },
  {
    value: 'inherit',
    label: '恢复跟随全局',
    desc: '清除这些用户的个人开关与自定义内容/密度，重新按全局策略生效。',
    icon: Droplets
  }
]

/** 头像/姓名展示：优先姓名，退回账号 */
function displayName(user: User): string {
  return user.realname || user.username
}

/**
 * 用户列表的「批量水印」
 *
 * 只给三档成品动作，不暴露 enabled/enforced 的任意组合（批量场景下没人需要「开但强制关」）。
 * 提交前一屏看清：勾了谁、当前各自是什么状态、这次会变成什么。
 */
export function BatchWatermarkDialog({ open, onOpenChange, targets, onSubmit }: BatchWatermarkDialogProps) {
  const [mode, setMode] = useState<BatchWatermarkMode>('on')
  const [submitting, setSubmitting] = useState(false)

  // 每次打开都回到默认档，避免沿用上次的「关闭」把人不小心关掉
  useEffect(() => {
    if (open) {
      setMode('on')
      setSubmitting(false)
    }
  }, [open])

  const effectiveOn = targets.filter(user => user.watermarkEffective).length
  const effectiveOff = targets.length - effectiveOn
  const preview = targets.slice(0, 6).map(displayName)
  const rest = targets.length - preview.length

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!targets.length || submitting) return
    setSubmitting(true)
    Promise.resolve(
      onSubmit(
        targets.map(user => user.id),
        mode
      )
    ).finally(() => setSubmitting(false))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>批量设置水印（{targets.length} 个用户）</DialogTitle>
          <DialogDescription>
            当前勾选中：已开启 {effectiveOn} 人 / 已关闭 {effectiveOff} 人。用户本人不能开关水印，只能在这里统一设置。
          </DialogDescription>
        </DialogHeader>

        <form id="batch-watermark-form" className="space-y-4" onSubmit={handleSubmit}>
          <div className="bg-muted/40 rounded-md border p-2 text-xs">
            <span className="text-muted-foreground">目标：</span>
            {preview.join('、')}
            {rest > 0 ? ` 等 ${targets.length} 人` : ''}
          </div>

          <div className="space-y-2">
            {MODE_OPTIONS.map(option => {
              const Icon = option.icon
              const checked = mode === option.value
              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                    checked ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'
                  }`}
                >
                  <input type="radio" name="batch-watermark-mode" className="accent-primary mt-1" checked={checked} onChange={() => setMode(option.value)} />
                  <Icon className={`mt-0.5 size-4 shrink-0 ${option.danger ? 'text-destructive' : 'text-primary'}`} />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="text-muted-foreground block text-xs">{option.desc}</span>
                  </span>
                </label>
              )
            })}
          </div>

          {mode === 'off' && (
            <p className="text-destructive text-xs">关闭水印后这些账号的截图将不再带身份信息，通常只在排查问题或临时演示时使用，请确认后继续。</p>
          )}
          {mode === 'inherit' && <p className="text-muted-foreground text-xs">已单独设置过的自定义文案与密度会被一并清除，无法撤销到原值。</p>}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button form="batch-watermark-form" type="submit" variant={mode === 'off' ? 'destructive' : 'default'} disabled={submitting || !targets.length}>
            {submitting ? '保存中…' : BATCH_WATERMARK_MODE_LABEL[mode]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
