import { getApiResult } from '@/lib/http'

export interface ServerInfo {
  host: {
    hostname: string
    os: string
    arch: string
    ip: string
    uptime: string
  }
  cpu: {
    model: string
    cores: number
    /** 采样瞬时使用率（%） */
    usage: number
  }
  memory: {
    /** MB */
    total: number
    /** MB */
    used: number
    usage: number
  }
  node: {
    version: string
    /** MB */
    memoryUsage: number
    uptime: string
  }
  disks: { name: string; total: number; used: number; usage: number }[]
}

/** 服务监控（后端实时采集 os 指标，不落表） */
export function fetchServerInfo(): Promise<ServerInfo> {
  return getApiResult<ServerInfo>('/backend-api/v1/monitor/server')
}
