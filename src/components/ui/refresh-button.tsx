import { RefreshCw } from 'lucide-react'
import { cn } from 'cn'

import { Button } from '@/components/ui/button'

interface RefreshButtonProps {
  onClick: () => void
  disabled?: boolean
  /** 加载中转圈（页面能拿到 loading 状态时传） */
  spinning?: boolean
  /** 默认「刷新」；特殊页面可传「重新加载」等 */
  title?: string
  className?: string
}

/**
 * 表格工具栏统一的刷新按钮。
 *
 * 只显示图标不留汉字，中文语义放 title / aria-label —— 鼠标悬浮有提示，
 * 屏幕阅读器也读得出来。各表格页统一用它，避免样式不一致。
 */
export function RefreshButton({ onClick, disabled, spinning, title = '刷新', className }: RefreshButtonProps) {
  return (
    <Button variant="outline" size="icon" title={title} aria-label={title} onClick={onClick} disabled={disabled} className={className}>
      <RefreshCw className={cn('size-4', spinning && 'animate-spin')} />
    </Button>
  )
}
