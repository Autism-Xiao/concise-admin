import { getApiResult } from '@/lib/http'

/** 字典（对齐后端 sys_dict，JeecgBoot 字段） */
export interface Dict {
  id: string
  dictName: string
  dictCode: string
  description?: string | null
  /** 0 正常 / 1 已删除 */
  delFlag: number
  /** 字典值类型：0 string / 1 number */
  type: number
  createBy?: string | null
  createTime?: string | null
  updateBy?: string | null
  updateTime?: string | null
  /** 字典项数量（后端列表带出） */
  itemCount?: number
}

/** 字典项（对齐后端 sys_dict_item） */
export interface DictItem {
  id: string
  dictId: string
  itemText: string
  itemValue: string
  description?: string | null
  sortOrder?: number
  /** 1 启用 / 0 不启用 */
  status: number
  createTime?: string | null
  updateTime?: string | null
}

export interface DictFormValues {
  dictName: string
  dictCode: string
  type: number
  description?: string
}

export interface DictItemFormValues {
  itemText: string
  itemValue: string
  sortOrder: number
  status: number
  description?: string
}

/** 分页返回（后端 Pagination 结构，对齐 jeecg IPage） */
export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages: number
}

const DICT_BASE = '/backend-api/v1/dicts'
const ITEM_BASE = '/backend-api/v1/dict-items'

/** 字典列表（全量不分页，keyword 模糊匹配名称/编码） */
export function fetchDicts(keyword?: string): Promise<Dict[]> {
  const search = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  return getApiResult<Dict[]>(`${DICT_BASE}${search}`)
}

export function createDict(values: DictFormValues): Promise<Dict> {
  return getApiResult<Dict>(DICT_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values)
  })
}

export function updateDict(id: string, values: Partial<DictFormValues>): Promise<Dict> {
  return getApiResult<Dict>(`${DICT_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values)
  })
}

export function deleteDict(id: string): Promise<{ deleted: number }> {
  return getApiResult<{ deleted: number }>(`${DICT_BASE}/${id}`, { method: 'DELETE' })
}

/** 后端 pageSize 上限 100（PagerDto 上 @Max(100)），超过直接 1001 报错 */
const ITEM_PAGE_SIZE = 100
/** 客户端分页最多翻 20 页（2000 条），防止脏数据把页面拖死 */
const ITEM_MAX_PAGES = 20

/**
 * 字典项列表（取全量，页面自己做客户端分页）
 * 按后端上限 100 条/页翻页累加，直到取完或触达 20 页上限；
 * 注意别再直接传 pageSize=200 —— 会命中 "pageSize must not be greater than 100"
 */
export async function fetchDictItems(params: { dictId: string; keyword?: string; status?: number }): Promise<DictItem[]> {
  const items: DictItem[] = []
  for (let page = 1; page <= ITEM_MAX_PAGES; page += 1) {
    const query = new URLSearchParams({ dictId: params.dictId, page: String(page), pageSize: String(ITEM_PAGE_SIZE) })
    if (params.keyword) query.set('keyword', params.keyword)
    if (params.status !== undefined) query.set('status', String(params.status))

    const result = await getApiResult<PageResult<DictItem>>(`${ITEM_BASE}?${query.toString()}`)
    items.push(...(result.records ?? []))
    const pages = result.pages ?? Math.ceil((result.total ?? 0) / ITEM_PAGE_SIZE)
    // 取完最后一页（或后端返回不足一页）即结束，避免多打一次空请求
    if (page >= pages || (result.records?.length ?? 0) < ITEM_PAGE_SIZE) {
      break
    }
  }
  return items
}

export function createDictItem(dictId: string, values: DictItemFormValues): Promise<DictItem> {
  return getApiResult<DictItem>(ITEM_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...values, dictId })
  })
}

export function updateDictItem(id: string, values: Partial<DictItemFormValues>): Promise<DictItem> {
  return getApiResult<DictItem>(`${ITEM_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values)
  })
}

export function deleteDictItem(id: string): Promise<{ deleted: number }> {
  return getApiResult<{ deleted: number }>(`${ITEM_BASE}/${id}`, { method: 'DELETE' })
}

/** 按字典编码取启用字典项（下拉框数据源，所有登录用户可用） */
export function fetchDictItemsByCode(code: string): Promise<{
  dictId: string
  dictCode: string
  dictName: string
  type: number
  items: Pick<DictItem, 'itemText' | 'itemValue' | 'sortOrder' | 'description'>[]
}> {
  return getApiResult(`${ITEM_BASE}/code/${encodeURIComponent(code)}`)
}
