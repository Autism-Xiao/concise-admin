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
