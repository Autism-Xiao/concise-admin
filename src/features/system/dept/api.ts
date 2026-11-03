import { getJson } from '@/lib/http'

export interface Dept {
  id: number
  name: string
  leader: string
  sort: number
  /** 上级部门 id，null 为顶级 */
  parentId: number | null
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchDepts(): Promise<Dept[]> {
  return getJson<Dept[]>('/mock/depts.json')
}

// 开发环境由 vite 中间件写入 public/mock/depts.json；生产环境换成真实接口
export async function saveDepts(depts: Dept[]): Promise<void> {
  const res = await fetch('/api/depts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(depts)
  })
  if (!res.ok) throw new Error('保存失败')
}
