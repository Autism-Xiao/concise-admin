import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import { LockScreen } from '@/components/lock-screen'
import { isLocked, LOCK_CHANGE_EVENT, setLocked } from '@/lib/lock-screen'
import { useShortcutAction } from '@/context/shortcut-provider'

interface LockContextValue {
  locked: boolean
  lock: () => void
  unlock: () => void
}

const LockContext = createContext<LockContextValue | null>(null)

/**
 * 锁屏状态 Provider（挂在认证布局外层）
 *
 * 状态本体在 sessionStorage（lib/lock-screen），这里只做 React 侧的镜像，
 * 监听同一事件保证设置界面 / 快捷键触发 / 解锁界面三处写入都能同步。
 * 锁定时在布局之上渲染全屏遮罩，密码校验通过才解除。
 */
export function LockProvider({ children }: { children: ReactNode }) {
  const [locked, setLockedState] = useState(isLocked)

  useEffect(() => {
    const sync = () => setLockedState(isLocked())
    window.addEventListener(LOCK_CHANGE_EVENT, sync)
    return () => window.removeEventListener(LOCK_CHANGE_EVENT, sync)
  }, [])

  const value = {
    locked,
    lock: () => setLocked(true),
    unlock: () => setLocked(false)
  }

  // 锁屏快捷键（默认 Ctrl+Shift+L，可在偏好设置改绑）；锁屏期间 ShortcutProvider 会静默全部快捷键
  useShortcutAction('lockScreen', () => setLocked(true))

  return (
    <LockContext.Provider value={value}>
      {children}
      {locked && <LockScreen />}
    </LockContext.Provider>
  )
}

export function useLock(): LockContextValue {
  const ctx = useContext(LockContext)
  if (!ctx) throw new Error('useLock 必须在 LockProvider 内使用')
  return ctx
}
