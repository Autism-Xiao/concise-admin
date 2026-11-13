'use client'

import * as React from 'react'
import { cn } from 'cn'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

import { Button } from '@/components/ui/button'
import { XIcon } from 'lucide-react'

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ asChild = false, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger> & { asChild?: boolean }) {
  if (asChild && React.isValidElement(children)) {
    return <DialogPrimitive.Trigger data-slot="dialog-trigger" render={children} {...props} />
  }
  return (
    <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props}>
      {children}
    </DialogPrimitive.Trigger>
  )
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ asChild = false, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Close> & { asChild?: boolean }) {
  if (asChild && React.isValidElement(children)) {
    return <DialogPrimitive.Close data-slot="dialog-close" render={children} {...props} />
  }
  return (
    <DialogPrimitive.Close data-slot="dialog-close" {...props}>
      {children}
    </DialogPrimitive.Close>
  )
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Backdrop>) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        'data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs',
        className
      )}
      {...props}
    />
  )
}

/** 把 children 分拣到三个插槽：DialogHeader → header、DialogFooter → footer、其余（含 DialogBody 展开）→ body。 */
function splitDialogSlots(children: React.ReactNode): {
  header: React.ReactNode[]
  body: React.ReactNode[]
  footer: React.ReactNode[]
} {
  const header: React.ReactNode[] = []
  const body: React.ReactNode[] = []
  const footer: React.ReactNode[] = []
  const walk = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, child => {
      if (!React.isValidElement(child)) {
        // 纯文本/数字等非元素节点不能丢，归入内容区
        if (child !== null && child !== undefined && typeof child !== 'boolean') body.push(child)
        return
      }
      if (child.type === DialogHeader) {
        header.push(child)
        return
      }
      if (child.type === DialogFooter) {
        footer.push(child)
        return
      }
      if (child.type === DialogBody) {
        // 固定布局下 DialogBody 仅是旧写法的容器标记，展开其内容交给统一的滚动区接管
        walk((child.props as { children?: React.ReactNode }).children)
        return
      }
      if (child.type === React.Fragment) {
        walk((child.props as { children?: React.ReactNode }).children)
        return
      }
      body.push(child)
    })
  }
  walk(children)
  return { header, body, footer }
}

/**
 * 公共弹框。
 *
 * - layout="fixed"（默认）：全局统一「固定头尾 + 内容区滚动」——自动把 DialogHeader / DialogFooter
 *   钉在顶部/底部（底部带分隔线），其余内容放进可滚动区；小屏也不丢标题和按钮。
 * - layout="free"：整个弹框随内容纵向滚动，供命令面板等自绘满幅布局使用。
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  layout = 'fixed',
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Popup> & {
  showCloseButton?: boolean
  layout?: 'fixed' | 'free'
}) {
  const slots = layout === 'fixed' ? splitDialogSlots(children) : null
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-scroll={layout === 'fixed' ? undefined : 'dialog'}
        className={cn(
          layout === 'fixed'
            ? 'bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden overscroll-contain rounded-xl text-sm ring-1 duration-100 outline-none sm:max-w-md'
            : 'bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 overflow-y-auto overscroll-contain rounded-xl p-6 text-sm ring-1 duration-100 outline-none sm:max-w-md',
          className
        )}
        {...props}
      >
        {slots ? (
          <>
            {slots.header.length > 0 && (
              <div data-slot="dialog-header" className="flex shrink-0 flex-col gap-2 px-6 pt-6 pb-4">
                {slots.header}
              </div>
            )}
            {slots.body.length > 0 && (
              <div
                data-slot="dialog-body"
                data-scroll="dialog"
                className={cn(
                  'min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6',
                  slots.header.length === 0 && 'pt-6',
                  slots.footer.length > 0 && 'pb-4'
                )}
              >
                {slots.body}
              </div>
            )}
            {slots.footer.length > 0 && (
              <div data-slot="dialog-footer" className="flex shrink-0 flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
                {slots.footer}
              </div>
            )}
          </>
        ) : (
          children
        )}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" render={<Button variant="ghost" className="absolute top-4 right-4" size="icon-sm" />}>
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

/** 自由布局（layout="free"）或需要手动接管滚动时的内容区；固定布局会由 DialogContent 自动生成滚动区。 */
function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-body" data-scroll="dialog" className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain', className)} {...props} />
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-header" className={cn('flex flex-col gap-2', className)} {...props} />
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean
}) {
  return (
    <div data-slot="dialog-footer" className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props}>
      {children}
      {showCloseButton && <DialogPrimitive.Close render={<Button variant="outline" />}>Close</DialogPrimitive.Close>}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn('font-heading leading-none font-medium', className)} {...props} />
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-muted-foreground *:[a]:hover:text-foreground text-sm *:[a]:underline *:[a]:underline-offset-3', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger
}
