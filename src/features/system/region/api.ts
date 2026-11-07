import { getApiResult, type PageResult } from '@/lib/http'

export interface Region {
  id: number | string
  /** 城市代码（电话区号，如 00852） */
  cityCode: string
  /** 区划代码（全局唯一） */
  areaCode: string
  /** 上级区划代码，顶级为 "0" */
  parentCode: string
  /** 邮编 */
  zipCode: string
  /** 层级：0 省份 1 城市 2 区县 3 街道 */
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

/** 区划写入参数（新增/更新共用） */
export interface RegionWritePayload {
  name: string
  areaCode: string
  parentCode: string
  level: number
  shortName?: string
  fullName?: string
  pinyin?: string
  cityCode?: string
  zipCode?: string
  lng?: string
  lat?: string
}

/** 导入接口返回的统计 */
export interface RegionImportResult {
  inserted: number
  updated: number
  skipped: number
  failed: Array<{ areaCode: string; reason: string }>
}

export interface RegionListParams {
  keyword?: string
  level?: number
  parentCode?: string
}

/** 区划列表（分页结构；keyword 匹配名称/简称/拼音/区划代码） */
export function fetchRegions(params: RegionListParams = {}): Promise<PageResult<Region>> {
  const qs = new URLSearchParams()
  if (params.keyword?.trim()) qs.set('keyword', params.keyword.trim())
  if (params.level !== undefined) qs.set('level', String(params.level))
  if (params.parentCode) qs.set('parentCode', params.parentCode)
  const query = qs.toString()
  return getApiResult<PageResult<Region>>(`/backend-api/v1/regions${query ? `?${query}` : ''}`)
}

/** 区划统计：总数 + 各层级数量（树形视图头部概览，避免为了数字拉全量） */
export interface RegionStats {
  total: number
  byLevel: Record<number, number>
}

/** 区划树（登录即可访问，级联选择器数据源） */
export function fetchRegionTree(): Promise<Array<Region & { children: Region[] }>> {
  return getApiResult('/backend-api/v1/regions/tree')
}

/** 区划统计（总数 + 各层级数量） */
export function fetchRegionStats(): Promise<RegionStats> {
  return getApiResult<RegionStats>('/backend-api/v1/regions/stats')
}

/** 按上级区划代码查直接子级（懒加载） */
export function fetchRegionChildren(parentCode: string): Promise<Region[]> {
  return getApiResult(`/backend-api/v1/regions/children/${encodeURIComponent(parentCode)}`)
}

/** 按区划代码查详情 */
export function fetchRegionByCode(areaCode: string): Promise<Region> {
  return getApiResult(`/backend-api/v1/regions/code/${encodeURIComponent(areaCode)}`)
}

export function createRegion(payload: RegionWritePayload): Promise<Region> {
  return getApiResult<Region>('/backend-api/v1/regions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function updateRegion(id: number | string, payload: Partial<RegionWritePayload>): Promise<Region> {
  return getApiResult<Region>(`/backend-api/v1/regions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function deleteRegion(id: number | string): Promise<void> {
  return getApiResult<null>(`/backend-api/v1/regions/${id}`, { method: 'DELETE' }).then(() => undefined)
}

/**
 * 批量导入区划：按 areaCode upsert（存在更新/不存在插入），单次最多 5000 条
 * 直接粘贴第三方区划库的 JSON 数组即可
 */
export function importRegions(regions: unknown[]): Promise<RegionImportResult> {
  return getApiResult<RegionImportResult>('/backend-api/v1/regions/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ regions })
  })
}
