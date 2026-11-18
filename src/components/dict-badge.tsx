import { cn } from '@/lib/utils'
import { dictColorClass } from '@/lib/dict-color'
import { useDictMeta } from '@/lib/dict'

interface DictBadgeProps {
  /** 字典编码，如 biz_audit_status */
  code: string
  /** 存储值；空值渲染 placeholder */
  value?: string | number | null
  /** 覆盖文案（字典里查不到、或想临时换个说法时用） */
  label?: string
  /** 值为空时的占位，默认 '-' */
  placeholder?: string
  className?: string
}

/**
 * 字典标签：文案和颜色都来自字典，业务页面不再维护 `priorityClass` 这类映射
 *
 * - 字典项配了 color → 渲染成圆角色块（浅底 + 深字 + 前置圆点，与 StatusBadge 同一套视觉）
 * - 没配 color → 退化成纯文本（分类类字典本来就不该套色块，硬套会很丑）
 * - 字典还没加载完 / 接口失败 → 直接显示原始值，不闪烁也不白屏
 *
 * 用法：`<DictBadge code="biz_audit_status" value={row.status} />`
 */
export function DictBadge({ code, value, label, placeholder = '-', className }: DictBadgeProps) {
  const meta = useDictMeta(code)
  const key = value === null || value === undefined ? '' : String(value)

  if (!key) {
    return <span className={cn('text-muted-foreground', className)}>{placeholder}</span>
  }

  const entry = meta[key]
  const text = label ?? entry?.text ?? key
  const colorClass = dictColorClass(entry?.color)

  if (!colorClass) {
    return <span className={className}>{text}</span>
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        colorClass,
        className
      )}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      {text}
    </span>
  )
}
