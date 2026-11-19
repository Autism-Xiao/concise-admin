/**
 * 锁屏状态（sessionStorage 瞬时镜像，状态源在服务端）
 *
 * 服务端锁标志在 Redis（POST /v1/auth/lock 写入 / verify-password 成功或登出清除），
 * LockProvider 启动时会用 GET /v1/auth/lock-state 纠正本地标志 —— 关机重开、换设备、
 * 清缓存都拦得住。sessionStorage 只服务「刷新页面锁屏保持」和锁屏期间快捷键静默等
 * 高频同步判断，避免每次按键都发请求。
 *
 * 模块级函数而非 Context：快捷键 Provider 的全局 keydown 需要在锁屏时静默，
 * 用 isLocked() 判断可以避免 Provider 之间的循环依赖。
 */
const LOCK_KEY = 'concise-locked'

export const LOCK_CHANGE_EVENT = 'concise-lock-change'

export function isLocked(): boolean {
  return sessionStorage.getItem(LOCK_KEY) === 'true'
}

export function setLocked(locked: boolean): void {
  if (locked) {
    sessionStorage.setItem(LOCK_KEY, 'true')
  } else {
    sessionStorage.removeItem(LOCK_KEY)
  }
  window.dispatchEvent(new Event(LOCK_CHANGE_EVENT))
}
