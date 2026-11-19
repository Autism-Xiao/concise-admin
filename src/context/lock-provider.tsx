import { useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createHmrSafeContext } from '@/lib/hmr-context'

import { LockScreen } from '@/components/lock-screen'
import { isLocked, LOCK_CHANGE_EVENT, setLocked } from '@/lib/lock-screen'
import { useShortcutAction } from '@/context/shortcut-provider'
import { getApiResult } from '@/lib/http'

interface LockContextValue {
  locked: boolean
  lock: () => void
  unlock: () => void
}

const LockContext = createHmrSafeContext<LockContextValue | null>('concise.context.lock', null)

/**
 * 锁屏状态 Provider（挂在认证布局外层）
 *
 * **状态源在服务端**（Redis，POST /v1/auth/lock 写入）：sessionStorage 只是瞬时镜像，
 * 供快捷键静默等高频判断用，不发请求。启动时用 GET /v1/auth/lock-state 的结果纠正本地
 * 标志 —— 这样关机重开/换设备/清缓存都会被锁屏拦住，而不是像纯本地方案那样一键绕过。
 *
 * 失败语义：状态查询失败按本地现状处理（fail-open，服务端也是查不到就当没锁）；
 * 锁屏 POST 失败只影响持久化，本地仍然锁住本次会话。
 */
export function LockProvider({ children }: { children: ReactNode }) {
  const [locked, setLockedState] = useState(isLocked)
  /** 本会话内用户是否主动碰过锁（锁/解锁）：启动期服务端结果不覆盖用户已做的选择 */
  const interactedRef = useRef(false)

  useEffect(() => {
    const sync = () => setLockedState(isLocked())
    window.addEventListener(LOCK_CHANGE_EVENT, sync)
    return () => window.removeEventListener(LOCK_CHANGE_EVENT, sync)
  }, [])

  // 启动期向服务端对齐：查到锁标志就锁（重开系统/换设备的场景），没有就按本地。
  // 只在「用户还没碰过锁」时应用，避免启动期在途响应把用户刚点的锁屏又覆盖掉。
  useEffect(() => {
    let cancelled = false
    getApiResult<{ locked: boolean }>('/backend-api/v1/auth/lock-state')
      .then(res => {
        if (!cancelled && !interactedRef.current) setLocked(res.locked)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const value = {
    locked,
    lock: () => {
      interactedRef.current = true
      setLocked(true)
      // 持久化到服务端；失败只影响「关机重开/换设备仍锁」，本次会话照样锁着
      void getApiResult('/backend-api/v1/auth/lock', { method: 'POST' }).catch(() => undefined)
    },
    unlock: () => {
      interactedRef.current = true
      setLocked(false)
    }
  }

  // 锁屏快捷键（默认 Ctrl+Shift+L，可在偏好设置改绑）；锁屏期间 ShortcutProvider 会静默全部快捷键
  useShortcutAction('lockScreen', () => value.lock())

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
