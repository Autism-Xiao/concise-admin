import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { isLocked } from '@/lib/lock-screen'
import {
  comboMatches,
  loadShortcuts,
  resetShortcuts,
  saveShortcut,
  SHORTCUTS_CHANGED_EVENT,
  SHORTCUT_IDS,
  type ShortcutId
} from '@/lib/shortcuts'

interface ShortcutContextValue {
  /** 当前生效的组合键（id → "Ctrl+J" 形式，空串表示未绑定） */
  shortcuts: Record<ShortcutId, string>
  setShortcut: (id: ShortcutId, combo: string) => void
  reset: () => void
  /** 注册动作（组件卸载时自动注销）；同一 id 重复注册以后注册的为准 */
  register: (id: ShortcutId, handler: (e: KeyboardEvent) => void) => () => void
}

const ShortcutContext = createContext<ShortcutContextValue | null>(null)

/**
 * 全局快捷键调度中心
 *
 * 单一 window keydown 监听器按「组合键 → 动作」分发，动作由各组件
 * useShortcutAction(id, handler) 注册。集中调度的原因：组合键可改绑后，
 * 分散在各组件里的监听器没法共享同一份配置，也会互相抢 preventDefault。
 *
 * 锁屏时静默所有快捷键（isLocked() 模块级判断），避免锁屏遮罩后面还能
 * 呼出命令面板等界面；锁屏界面自己的输入框不经过这里。
 */
export function ShortcutProvider({ children }: { children: ReactNode }) {
  const [shortcuts, setShortcuts] = useState(loadShortcuts)
  const handlers = useRef(new Map<ShortcutId, (e: KeyboardEvent) => void>())

  // 设置界面保存 / 重置后同步 state
  useEffect(() => {
    const sync = () => setShortcuts(loadShortcuts())
    window.addEventListener(SHORTCUTS_CHANGED_EVENT, sync)
    return () => window.removeEventListener(SHORTCUTS_CHANGED_EVENT, sync)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 锁屏期间屏蔽全部全局快捷键（遮罩层之上的组件自带交互）
      if (isLocked()) return
      for (const id of SHORTCUT_IDS) {
        const combo = shortcuts[id]
        if (combo && comboMatches(e, combo)) {
          const handler = handlers.current.get(id)
          if (handler) {
            e.preventDefault()
            handler(e)
          }
          return
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcuts])

  // register / setShortcut / reset 都是稳定引用（依赖为空），value 只随 shortcuts 变化
  const register = useCallback((id: ShortcutId, handler: (e: KeyboardEvent) => void) => {
    handlers.current.set(id, handler)
    return () => {
      if (handlers.current.get(id) === handler) handlers.current.delete(id)
    }
  }, [])
  const setShortcut = useCallback((id: ShortcutId, combo: string) => saveShortcut(id, combo), [])
  const reset = useCallback(() => resetShortcuts(), [])
  const value = useMemo(() => ({ shortcuts, setShortcut, reset, register }), [shortcuts, setShortcut, reset, register])

  return <ShortcutContext.Provider value={value}>{children}</ShortcutContext.Provider>
}

export function useShortcuts(): ShortcutContextValue {
  const ctx = useContext(ShortcutContext)
  if (!ctx) throw new Error('useShortcuts 必须在 ShortcutProvider 内使用')
  return ctx
}

/**
 * 注册快捷键动作。handler 用 ref 保存，组件每次渲染都更新，
 * 因此回调里可以放心读最新的 state/props 而不必加依赖。
 */
export function useShortcutAction(id: ShortcutId, handler: (e: KeyboardEvent) => void): void {
  const { register } = useShortcuts()
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => register(id, e => ref.current(e)), [register, id])
}
