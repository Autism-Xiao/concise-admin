import { getJson } from '@/lib/http'

export interface CacheKeyStat {
  name: string
  count: number
  ttl: string
  description: string
}

export interface CacheInfo {
  mode: string
  keyCount: number
  memoryUsed: string
  /** 命中率百分比 */
  hitRate: number
  keys: CacheKeyStat[]
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchCacheInfo(): Promise<CacheInfo> {
  return getJson<CacheInfo>('/mock/ops-cache.json')
}
