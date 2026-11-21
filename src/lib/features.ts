import { useEffect, useState } from 'react'

import { getApiResult } from '@/lib/http'

/**
 * 特性开关前端消费层（对应后端 GET /v1/features）
 *
 * 后端按「平台行 ∪ 租户覆盖行」返回当前视角的全部生效开关（键不带 feature. 前缀），
 * 前端用它做界面能力的显隐：开关关闭的入口直接不渲染，点了也只会 403 的按钮没有存在意义。
 *
 * 缓存策略：模块级缓存 + sessionStorage 快照。特性开关变更是低频管理动作，
 * 拉取失败时回退快照或空对象（空 = 开关默认关 → 入口隐藏，fail-safe 方向正确）；
 * 租户切换后由 notifyFeaturesReset 清缓存（下一个 hook 挂载时重新拉取）。
 */

const CACHE_KEY = 'concise-features'
const FALLBACK: Record<string, boolean> = {}

let cache: Record<string, boolean> | null = null
let inflight: Promise<Record<string, boolean>> | null = null

function readSnapshot(): Record<string, boolean> {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : FALLBACK
  } catch {
    return FALLBACK
  }
}

/** 拉取当前租户视角的全部开关；并发调用共享同一请求 */
export function fetchFeatures(): Promise<Record<string, boolean>> {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = getApiResult<Record<string, boolean>>('/backend-api/v1/features')
      .then(flags => {
        cache = flags && typeof flags === 'object' ? flags : FALLBACK
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache))
        } catch {
          /* 存储满/隐私模式：只影响下次冷启动多一次请求 */
        }
        return cache
      })
      .catch(() => {
        // 拉取失败回退快照：界面回到上次已知状态，而不是把所有入口闪没
        cache = readSnapshot()
        return cache
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

/** 租户切换 / 登录登出时调用：开关是租户视角的数据，必须随视角失效 */
export function notifyFeaturesReset(): void {
  cache = null
  try {
    sessionStorage.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * 订阅单个开关：enabled 缺省为 false（后端没返回 = 没开）。
 * 组件里 `const enabled = useFeature('rbac.superviseDept')` 即可用。
 */
export function useFeature(name: string): boolean {
  const [enabled, setEnabled] = useState(() => cache?.[name] ?? false)
  useEffect(() => {
    if (cache && name in cache) {
      setEnabled(cache[name])
      return
    }
    let cancelled = false
    void fetchFeatures().then(flags => {
      if (!cancelled) setEnabled(!!flags[name])
    })
    return () => {
      cancelled = true
    }
  }, [name])
  return enabled
}
