import { getApiResult } from '@/lib/http'

export interface CacheKeyStat {
  /** key 前缀，如 online:session: */
  name: string
  count: number
  /** 过期策略（抽样最长 TTL 的可读描述） */
  ttl: string
  description: string
}

export interface CacheInfo {
  /** 缓存模式，如 Redis 3.0.504 */
  mode: string
  keyCount: number
  memoryUsed: string
  /** 命中率百分比 */
  hitRate: number
  keys: CacheKeyStat[]
}

const BASE = '/backend-api/v1/monitor/cache'

/** 缓存监控（后端读 Redis INFO + 前缀统计） */
export function fetchCacheInfo(): Promise<CacheInfo> {
  return getApiResult<CacheInfo>(BASE)
}

/**
 * 清理缓存：
 * - 传前缀只清该前缀下的 key
 * - 不传前缀时后端只清理本项目的前缀（在线会话/下线黑名单/验证码），不会 flushdb
 */
export function clearCache(prefix?: string): Promise<{ cleared: number; prefixes: string[] }> {
  const search = prefix ? `?prefix=${encodeURIComponent(prefix)}` : ''
  return getApiResult<{ cleared: number; prefixes: string[] }>(`${BASE}${search}`, { method: 'DELETE' })
}
