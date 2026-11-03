import { getJson } from '@/lib/http'

export type DictStatus = '正常' | '停用'

export interface Dict {
  id: number
  name: string
  /** 字典类型编码 */
  type: string
  status: DictStatus
  remark: string
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchDicts(): Promise<Dict[]> {
  return getJson<Dict[]>('/mock/dicts.json')
}
