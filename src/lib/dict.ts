import { useEffect, useState } from 'react'
import { getApiResult } from '@/lib/http'
import type { DictColor } from '@/lib/dict-color'

/**
 * 字典驱动的下拉数据 + 标签配色
 *
 * 为什么需要这一层：
 * 以前每个页面的下拉选项都写死在代码里（`items={{ 0: '未知', 1: '男', 2: '女' }}`），
 * 运营想把「未知」改成「保密」就得改代码发版。字典建好后必须有个统一入口去读，
 * 否则字典管理页只是个摆设。
 *
 * 颜色同理：优先级/审核状态的红黄绿也曾写死在前端映射里（见 notice/task 的 priorityClass），
 * 现在由字典项的 `color` 字段提供，业务页面只写 `<DictBadge code="..." value={...} />`。
 *
 * 约定：
 * - `useDict` 返回 `Record<存储值, 显示文案>`，与 `<Select items={...}>` 同形，可直接传（签名保持不变，7 处调用点零改动）
 * - `useDictMeta` 返回 `Record<存储值, { text, color }>`，给需要上色的场景用
 * - 模块级缓存 + 并发去重：一个页面 3 个下拉、或者 20 个页面用同一字典，全站只发一次请求
 * - **必须给 fallback**：字典被删/接口挂掉时回落到代码内默认项，下拉不能是空的
 *
 * 后端接口：GET /v1/dict-items/code/:code（所有登录用户可用，只返回启用项，按 sort_order 排序）
 */

/** 存储值 → 显示文案（与 Select 的 items 属性同形） */
export type DictItems = Record<string, string>

/** 单个字典项的完整信息 */
export interface DictEntry {
  itemText: string
  itemValue: string
  sortOrder?: number
  description?: string | null
  /** 语义色，空表示该字典项按纯文本渲染 */
  color?: string | null
}

/** 存储值 → { 文案, 颜色 }，给 DictBadge 用 */
export type DictMeta = Record<string, { text: string; color?: DictColor }>

interface DictResponse {
  dictId: string
  dictCode: string
  dictName: string
  items: DictEntry[]
}

/** 缓存存完整条目：useDict / useDictMeta 各自派生视图，避免同一字典取两份数据 */
const cache = new Map<string, DictEntry[]>()
const inflight = new Map<string, Promise<DictEntry[]>>()

function toItems(entries: DictEntry[]): DictItems {
  const items: DictItems = {}
  for (const entry of entries) items[String(entry.itemValue)] = entry.itemText
  return items
}

function toMeta(entries: DictEntry[]): DictMeta {
  const meta: DictMeta = {}
  for (const entry of entries) {
    meta[String(entry.itemValue)] = {
      text: entry.itemText,
      // 认不出的色（后端先加了新色、前端还没发版）当没配处理，渲染层退化成纯文本
      color: (entry.color || undefined) as DictColor | undefined
    }
  }
  return meta
}

/** 取字典原始条目（带缓存与并发去重） */
function loadEntries(code: string): Promise<DictEntry[]> {
  const cached = cache.get(code)
  if (cached) return Promise.resolve(cached)
  const pending = inflight.get(code)
  if (pending) return pending

  const task = getApiResult<DictResponse>(`/backend-api/v1/dict-items/code/${encodeURIComponent(code)}`)
    .then(res => {
      const entries = res.items ?? []
      cache.set(code, entries)
      return entries
    })
    .finally(() => inflight.delete(code))

  inflight.set(code, task)
  return task
}

/** 取字典（带缓存与并发去重） */
export async function loadDict(code: string): Promise<DictItems> {
  return toItems(await loadEntries(code))
}

/** 取字典（带颜色） */
export async function loadDictMeta(code: string): Promise<DictMeta> {
  return toMeta(await loadEntries(code))
}

/**
 * 组件里读字典
 *
 * @param code 字典编码，如 sys_notice_priority
 * @param fallback 代码内兜底项：字典缺失/接口失败时用它，保证下拉不为空
 */
export function useDict(code: string, fallback: DictItems = {}): DictItems {
  const [items, setItems] = useState<DictItems>(() => {
    const cached = cache.get(code)
    return cached ? toItems(cached) : fallback
  })

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

/**
 * 组件里读字典（带颜色）
 *
 * 与 useDict 共用同一份缓存，同一页面同时用两个 hook 也只会发一次请求。
 * 返回空对象时 DictBadge 退化成直接显示原始值，不会白屏。
 */
export function useDictMeta(code: string): DictMeta {
  const [meta, setMeta] = useState<DictMeta>(() => {
    const cached = cache.get(code)
    return cached ? toMeta(cached) : {}
  })

  useEffect(() => {
    let alive = true
    loadDictMeta(code)
      .then(next => {
        if (alive) setMeta(next)
      })
      .catch(() => {
        /* 接口失败：DictBadge 退化成纯文本，不阻塞页面 */
      })
    return () => {
      alive = false
    }
  }, [code])

  return meta
}

/** 清空缓存：字典管理页改完项后调用，业务页下次进来自动拿新数据 */
export function clearDictCache(): void {
  cache.clear()
}
