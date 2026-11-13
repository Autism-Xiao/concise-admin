import { cn } from 'cn'

interface SegmentedOption {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

interface SegmentedProps {
  /** 当前选中的 option.value */
  value: string
  options: SegmentedOption[]
  onChange: (value: string) => void
  /** 整体禁用（如提交中） */
  disabled?: boolean
  className?: string
}

/**
 * 分段选择器（Segmented Control）：互斥的少量选项在一行内切换，
 * 比下拉省一次点击，比单选框省空间；选中态用浮起的背景块表达。
 */
export function Segmented({ value, options, onChange, disabled = false, className }: SegmentedProps) {
  return (
    <div
      role="radiogroup"
      className={cn('bg-muted inline-flex h-8 items-center gap-0.5 rounded-lg p-0.5', disabled && 'pointer-events-none opacity-60', className)}
    >
      {options.map(option => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled || option.disabled}
            onClick={() => !active && onChange(option.value)}
            className={cn(
              'flex h-7 items-center rounded-md px-3 text-xs font-medium whitespace-nowrap transition-colors outline-none',
              'disabled:pointer-events-none disabled:opacity-60',
              active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
