import { getJson } from '@/lib/http'

export type LevelStatus = '正常' | '停用'

export interface Level {
  id: number
  /** 职级名称，如 P6 / M1 */
  name: string
  /** 等级排序，数字越大级别越高 */
  rank: number
  status: LevelStatus
  remark: string
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchLevels(): Promise<Level[]> {
  return getJson<Level[]>('/mock/levels.json')
}

// 开发环境由 vite 中间件写入 public/mock/levels.json；生产环境换成真实接口
export async function saveLevels(levels: Level[]): Promise<void> {
  const res = await fetch('/api/levels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(levels)
  })
  if (!res.ok) throw new Error('保存失败')
}
