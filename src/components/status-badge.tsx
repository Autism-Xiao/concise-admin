import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  ok: boolean
  label: string
  /**
   * 呼吸灯：只给「活的」状态开（运行中 / 在线 / 进行中）。
   * 静态配置态（正常 / 停用 / 启用 / 已发布）一律不开——列表里几十个 tag 同时闪烁会变成噪音。
   */
  pulse?: boolean
  className?: string
}

/**
 * 状态徽标：ok 绿、否则红，前置一个状态圆点。
 * pulse 时圆点叠加柔和光晕并做 2.4s 明暗呼吸（prefers-reduced-motion 下自动静止）。
 */
export function StatusBadge({ ok, label, pulse = false, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        ok ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/15 text-destructive',
        className
      )}
    >
      <span className="relative inline-flex size-1.5 shrink-0">
        {pulse && (
          <span
            aria-hidden
            className="bg-current animate-status-breathe absolute -inset-1 rounded-full opacity-25 blur-[3px]"
          />
        )}
        <span
          aria-hidden
          className={cn(
            'relative size-1.5 rounded-full bg-current',
            pulse && 'shadow-[0_0_5px_currentColor] animate-status-breathe'
          )}
        />
      </span>
      {label}
    </span>
  )
}
