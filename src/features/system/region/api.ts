import { getJson } from '@/lib/http'

export interface Region {
  id: number
  /** 区划代码 */
  areaCode: string
  /** 上级区划代码，省级为 "0" */
  parentCode: string
  /** 邮编 */
  zipCode: string
  /** 层级：0 省份 1 城市 2 区县 */
  level: number
  levelText: string
  name: string
  shortName: string
  fullName: string
  pinyin: string
  /** 经度 */
  lng: string
  /** 纬度 */
  lat: string
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchRegions(): Promise<Region[]> {
  return getJson<Region[]>('/mock/regions.json')
}

// 开发环境由 vite 中间件写入 public/mock/regions.json；生产环境换成真实接口
export async function saveRegions(regions: Region[]): Promise<void> {
  const res = await fetch('/api/regions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regions)
  })
  if (!res.ok) throw new Error('保存失败')
}
