import type { FormEvent, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

/**
 * 公共抽屉（右侧滑出）
 *
 * 为什么不用 Dialog：表单字段一多，居中弹窗要么把页面顶出滚动条、要么内部滚动区高度
 * 被标题和按钮挤得很小。抽屉占满视口高度，头/尾固定、中间独立滚动，长表单体验稳定。
 *
 * 两种用法：
 *  1. 表单：传 `onSubmit`，组件把内容区和底部按钮包进同一个 <form>，主按钮即 submit，
 *     回车提交、原生 required/minLength 校验都能生效；
 *  2. 纯展示：不传 `onSubmit`，自己用 `footer` 给底部操作（传 `null` 则完全不要底栏）。
 */
export type AppDrawerSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASS: Record<AppDrawerSize, string> = {
  // 默认 SheetContent 是 data-[side=right]:sm:max-w-sm，必须用同样的变体前缀才能被合并覆盖
  sm: 'data-[side=right]:sm:max-w-md',
  md: 'data-[side=right]:sm:max-w-lg',
  lg: 'data-[side=right]:sm:max-w-xl',
  xl: 'data-[side=right]:sm:max-w-2xl'
}

interface AppDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  /** 宽度档位，默认 md（约 512px） */
  size?: AppDrawerSize
  children: ReactNode
  /** 传入即渲染 <form>，底部主按钮变为提交按钮 */
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void
  /** 提交中：主按钮转圈禁用、取消按钮禁用，防止重复提交 */
  submitting?: boolean
  submitText?: string
  cancelText?: string
  /** 数据没加载完等场景禁用提交 */
  submitDisabled?: boolean
  /** 自定义底部；不传则表单模式给「取消 / 保存」，展示模式不给底栏 */
  footer?: ReactNode
  /** 内容滚动区附加类 */
  bodyClassName?: string
}

export function AppDrawer({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  children,
  onSubmit,
  submitting = false,
  submitText = '保存',
  cancelText = '取消',
  submitDisabled = false,
  footer,
  bodyClassName
}: AppDrawerProps) {
  const body = <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-4', bodyClassName)}>{children}</div>

  const footerNode =
    footer !== undefined ? (
      footer
    ) : onSubmit ? (
      <SheetFooter className="flex-row justify-end gap-2 border-t px-5 py-3">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
          {cancelText}
        </Button>
        <Button type="submit" disabled={submitting || submitDisabled}>
          {submitting ? '保存中…' : submitText}
        </Button>
      </SheetFooter>
    ) : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn('gap-0 p-0', SIZE_CLASS[size])}>
        <SheetHeader className="gap-1 border-b px-5 py-4 pr-12">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            {body}
            {footerNode}
          </form>
        ) : (
          <>
            {body}
            {footerNode}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
