import { cn } from '@/lib/utils'

/** 状态徽标：ok 为绿色，否则红色 */
export function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
        ok ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/15 text-destructive'
      )}
    >
      {label}
    </span>
  )
}
