import * as React from 'react'
import { cn } from 'cn'

type AnyProps = Record<string, unknown>

// 轻量 Slot：把父组件的 props（className、事件、data-*）合并到唯一的子元素上。
// 同名事件父、子都会执行（先父后子）；className 自动拼接
export function Slot({ children, ...props }: { children?: React.ReactNode } & AnyProps) {
  if (!React.isValidElement<AnyProps>(children)) return null
  const childProps = children.props
  const merged: AnyProps = { ...props, ...childProps }

  for (const key of Object.keys(props)) {
    const parentValue = props[key]
    const childValue = childProps[key]
    if (/^on[A-Z]/.test(key) && typeof parentValue === 'function' && typeof childValue === 'function') {
      merged[key] = (...args: unknown[]) => {
        ;(parentValue as (...a: unknown[]) => void)(...args)
        ;(childValue as (...a: unknown[]) => void)(...args)
      }
    }
  }
  merged.className = cn(props.className as string | undefined, childProps.className as string | undefined)

  return React.cloneElement(children, merged)
}
