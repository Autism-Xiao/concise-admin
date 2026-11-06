/**
 * 锁屏状态（sessionStorage）
 *
 * 为什么用 sessionStorage：刷新页面锁屏保持（防 F12 绕过不了但至少 UI 不闪内容），
 * 关闭标签页自动解锁（重新打开需要重新登录，凭证本身还在 localStorage）。
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
