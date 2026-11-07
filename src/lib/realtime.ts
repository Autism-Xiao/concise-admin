import { io, type Socket } from 'socket.io-client'
import { toast } from 'sonner'

import { AUTH_CHANGED_EVENT, getAccessToken, logout } from './auth'

/**
 * WebSocket 实时推送客户端（socket.io）
 *
 * 连接时机：登录成功 / 页面加载已有 token 时 connect()；登出时 disconnect()。
 * 服务端事件统一转发为 window CustomEvent，组件层不感知 socket 实例：
 *  - ws:message:new       站内信新消息（顶栏 MessageBell 刷红点 + toast）
 *  - ws:reminder:triggered 日历提醒触发（ReminderBell 刷红点 + toast）
 *  - ws:force-offline     被强制下线（toast + 本地登出跳登录页）
 *
 * 断线重连由 socket.io 内建（指数退避），token 过期时服务端握手直接断开，
 * 因此 on disconnect 不做无限重试：401 类失败（io error 握手被拒）交给下一次登录重连。
 */

/** 服务端事件 → window 事件名 */
const EVENT_MAP: Record<string, string> = {
  'message:new': 'ws:message:new',
  'reminder:triggered': 'ws:reminder:triggered',
  'force-offline': 'ws:force-offline'
}

let socket: Socket | null = null
/** 防止 force-offline 处理器与 logout 互相触发死循环 */
let forcedOut = false

function emitWindow(name: string, detail: unknown): void {
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

/** 建立（或复用）WebSocket 连接；未登录是无操作 */
export function connectRealtime(): void {
  const token = getAccessToken()
  if (!token || socket?.connected) return
  if (socket) {
    // token 可能已刷新：断开旧的按新凭证重连
    socket.disconnect()
  }
  forcedOut = false
  socket = io('/', {
    path: '/api/ws',
    transports: ['websocket', 'polling'],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30_000
  })

  socket.on('connect', () => emitWindow('ws:connected', null))
  socket.on('disconnect', reason => {
    // 服务端在鉴权失败时主动断开：此时不该傻等重连，等下一次登录即可
    if (reason === 'io server disconnect') socket?.connect()
  })

  for (const [serverEvent, windowEvent] of Object.entries(EVENT_MAP)) {
    socket.on(serverEvent, payload => {
      if (serverEvent === 'force-offline') {
        handleForceOffline(payload)
        return
      }
      if (serverEvent === 'message:new') {
        const message = payload as { title?: string }
        toast.info(`新消息：${message?.title ?? ''}`)
      }
      if (serverEvent === 'reminder:triggered') {
        const reminder = payload as { message?: string }
        toast.warning(reminder?.message ?? '日程提醒')
      }
      emitWindow(windowEvent, payload)
    })
  }
}

function handleForceOffline(payload: unknown): void {
  if (forcedOut) return
  forcedOut = true
  const reason = (payload as { reason?: string })?.reason ?? '您已被强制下线'
  toast.error(reason)
  logout()
  window.location.hash = ''
  // 硬跳登录页：当前页面可能有 keep-alive 状态，直接刷新最干净
  window.location.href = '/login'
}

/** 登出或切换账号时断开 */
export function disconnectRealtime(): void {
  socket?.disconnect()
  socket = null
}

/**
 * 生命周期挂载（main.tsx 调一次）：
 * - 应用启动时已有 token（刷新页面）→ 立即连
 * - 登录成功 / 登出 → 跟随 AUTH_CHANGED_EVENT 连/断，业务代码不用各自调用
 */
export function initRealtime(): void {
  window.addEventListener(AUTH_CHANGED_EVENT, () => {
    if (getAccessToken()) connectRealtime()
    else disconnectRealtime()
  })
  if (getAccessToken()) connectRealtime()
}
