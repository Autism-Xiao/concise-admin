import { useEffect, useState } from 'react'
import { getApiResult } from '@/lib/http'

/**
 * 字典驱动的下拉数据
 *
 * 为什么需要这一层：
 * 以前每个页面的下拉选项都写死在代码里（`items={{ 0: '未知', 1: '男', 2: '女' }}`），
 * 运营想把「未知」改成「保密」就得改代码发版。字典建好后必须有个统一入口去读，
 * 否则字典管理页只是个摆设。
 *
 * 约定：
 * - 返回值就是 `Record<存储值, 显示文案>`，与 `<Select items={...}>` 同形，可直接传
 * - 模块级缓存 + 并发去重：一个页面 3 个下拉、或者 20 个页面用同一字典，全站只发一次请求
 * - **必须给 fallback**：字典被删/接口挂掉时回落到代码内默认项，下拉不能是空的
 *
 * 后端接口：GET /v1/dict-items/code/:code（所有登录用户可用，只返回启用项，按 sort_order 排序）
 */

/** 存储值 → 显示文案（与 Select 的 items 属性同形） */
export type DictItems = Record<string, string>

interface DictResponse {
  dictId: string
  dictCode: string
  dictName: string
  items: Array<{ itemText: string; itemValue: string; sortOrder?: number }>
}

const cache = new Map<string, DictItems>()
const inflight = new Map<string, Promise<DictItems>>()

/** 取字典（带缓存与并发去重） */
export function loadDict(code: string): Promise<DictItems> {
  const cached = cache.get(code)
  if (cached) return Promise.resolve(cached)
  const pending = inflight.get(code)
  if (pending) return pending

  const task = getApiResult<DictResponse>(`/backend-api/v1/dict-items/code/${encodeURIComponent(code)}`)
    .then(res => {
      const items: DictItems = {}
      for (const item of res.items ?? []) items[String(item.itemValue)] = item.itemText
      cache.set(code, items)
      return items
    })
    .finally(() => inflight.delete(code))

  inflight.set(code, task)
  return task
}

/**
 * 组件里读字典
 *
 * @param code 字典编码，如 sys_notice_priority
 * @param fallback 代码内兜底项：字典缺失/接口失败时用它，保证下拉不为空
 */
export function useDict(code: string, fallback: DictItems = {}): DictItems {
  const [items, setItems] = useState<DictItems>(() => cache.get(code) ?? fallback)

  useEffect(() => {
    let alive = true
    loadDict(code)
      .then(next => {
        // 空字典视为「没配」，保留兜底项，避免下拉变成空盒子
        if (alive && Object.keys(next).length > 0) setItems(next)
      })
      .catch(() => {
        /* 接口失败：静默用兜底项，页面不该因为一个下拉崩掉 */
      })
    return () => {
      alive = false
    }
  }, [code])

  return items
}

/** 清空缓存：字典管理页改完项后调用，业务页下次进来自动拿新数据 */
export function clearDictCache(): void {
  cache.clear()
}
