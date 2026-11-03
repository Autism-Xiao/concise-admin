import { getJson } from '@/lib/http'

export type LogStatus = '成功' | '失败'

export interface LoginLog {
  id: number
  user: string
  ip: string
  location: string
  browser: string
  os: string
  time: string
  status: LogStatus
}

export interface OperationLog {
  id: number
  user: string
  action: string
  ip: string
  /** 耗时（毫秒） */
  cost: number
  time: string
  status: LogStatus
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchLoginLogs(): Promise<LoginLog[]> {
  return getJson<LoginLog[]>('/mock/logs-login.json')
}

export function fetchOperationLogs(): Promise<OperationLog[]> {
  return getJson<OperationLog[]>('/mock/logs-operation.json')
}
