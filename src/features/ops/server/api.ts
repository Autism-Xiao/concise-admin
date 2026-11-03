import { getJson } from '@/lib/http'

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

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchServerInfo(): Promise<ServerInfo> {
  return getJson<ServerInfo>('/mock/ops-server.json')
}
