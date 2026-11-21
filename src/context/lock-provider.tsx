import { useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
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
 *
 * 启动闪屏：sessionStorage 是会话级的，关标签页/浏览器再开会清空，此时首帧
 * `isLocked()` 恒为 false，会先渲染出工作区、等 lock-state 回来才切锁屏 —— 那一下
 * 工作区内容闪现就是"闪屏"。用 `checking` 态在服务端确认前盖一层与锁屏同款的全屏
 * 遮罩，确认后要么落到锁屏、要么落到工作区，中间不暴露工作区内容。
 */
export function LockProvider({ children }: { children: ReactNode }) {
  const [locked, setLockedState] = useState(isLocked)
  /** 启动期服务端锁屏状态是否已确认（确认前盖遮罩，避免工作区闪现） */
  const [checking, setChecking] = useState(true)
  /** 本会话内用户是否主动碰过锁（锁/解锁）：启动期服务端结果不覆盖用户已做的选择 */
  const interactedRef = useRef(false)

  useEffect(() => {
    const sync = () => setLockedState(isLocked())
    window.addEventListener(LOCK_CHANGE_EVENT, sync)
    return () => window.removeEventListener(LOCK_CHANGE_EVENT, sync)
  }, [])

  // 启动期向服务端对齐：查到锁标志就锁（重开系统/换设备的场景），没有就按本地。
  // 只在「用户还没碰过锁」时应用，避免启动期在途响应把用户刚点的锁屏又覆盖掉。
  // 无论成功/失败都要结束 checking：失败按 fail-open 保留本地现状，绝不能卡在遮罩里。
  useEffect(() => {
    let cancelled = false
    getApiResult<{ locked: boolean }>('/backend-api/v1/auth/lock-state')
      .then(res => {
        if (!cancelled && !interactedRef.current) setLocked(res.locked)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setChecking(false)
      })
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

  // 只在「本地未锁 + 服务端未确认」这段窗口盖遮罩：这正是会闪屏的路径
  // （本地锁着的情况直接渲染 LockScreen，不必等接口，否则转圈→锁屏又是一次闪）。
  // 遮罩盖住 children 而非卸载，避免工作区组件重新挂载/重新拉数据。
  const pendingVerify = checking && !locked

  return (
    <LockContext.Provider value={value}>
      {children}
      {pendingVerify && (
        <div className="bg-background/80 fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md" aria-hidden>
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      )}
      {locked && <LockScreen />}
    </LockContext.Provider>
  )
}

export function useLock(): LockContextValue {
  const ctx = useContext(LockContext)
  if (!ctx) throw new Error('useLock 必须在 LockProvider 内使用')
  return ctx
}
