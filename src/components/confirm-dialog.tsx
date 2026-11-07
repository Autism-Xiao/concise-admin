import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  /** 说明文字，如：即将删除用户「张三」，该操作不可恢复。 */
  description: ReactNode
  /**
   * 确认按钮文案，默认「确定」。
   * **非删除类操作必须显式传**（「强制下线」「冻结」「清理」「恢复」…），
   * 否则会出现「强退弹窗的按钮写着删除」这种语义错位。
   */
  confirmText?: string
  /**
   * 确认按钮配色，默认 destructive（红）。
   * 破坏性/中断性操作（删除、强退、清理缓存、彻底删除）用 destructive；
   * 恢复、解冻、启用这类正向操作用 default（主色），避免用红色吓人。
   */
  confirmVariant?: 'default' | 'destructive'
  /** 处理中：禁用取消与确认，确认按钮显示「处理中…」 */
  loading?: boolean
  onConfirm: () => void
}

/**
 * 通用二次确认弹窗：删除 / 强制下线 / 冻结 / 清理 / 恢复 共用一套壳，
 * 标题、按钮文案、按钮配色全部由调用方决定，不再让「删除」冒充所有操作。
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title = '确认操作',
  description,
  confirmText = '确定',
  confirmVariant = 'destructive',
  loading = false,
  onConfirm
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={next => !loading && onOpenChange(next)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant={confirmVariant} disabled={loading} onClick={onConfirm}>
            {loading ? '处理中…' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
