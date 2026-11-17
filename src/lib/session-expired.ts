/**
 * 会话过期的全局通知（单例 + 去重）
 *
 * 401 到来时 `lib/http.ts` 只负责「登出 + 广播」，不再直接整页跳登录 ——
 * 跳转前先让用户看到一个明确的「登录已过期」弹框（`SessionExpiredDialog`，
 * 挂在 `__root`），点「重新登录」才跳。之前直接 `location.assign('/login')`
 * 的表现是页面闪一下就没了，用户不知道发生了什么，正在填的表单也没机会看一眼。
 *
 * 去重：登出后并发的一批在途请求会同时收到 401，只弹一个框；
 * 「重新登录」被点击后 `resetSessionExpiredFlag()` 复位，下一轮过期才能再弹。
 */
const SESSION_EXPIRED_EVENT = 'concise:session-expired'
let notified = false

/** 401 处理器调用：去重后广播「会话已过期」 */
export function notifySessionExpired(): void {
  if (notified) return
  notified = true
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
}

/** 弹框组件订阅；返回退订函数 */
export function onSessionExpired(listener: () => void): () => void {
  const handler = () => listener()
  window.addEventListener(SESSION_EXPIRED_EVENT, handler)
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler)
}

/** 重置去重标记（重新登录按钮点击后调用） */
export function resetSessionExpiredFlag(): void {
  notified = false
}
