import { getJson } from '@/lib/http'

export interface OnlineUser {
  sessionId: string
  username: string
  dept: string
  ip: string
  location: string
  browser: string
  os: string
  loginTime: string
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchOnlineUsers(): Promise<OnlineUser[]> {
  return getJson<OnlineUser[]>('/mock/ops-online.json')
}
