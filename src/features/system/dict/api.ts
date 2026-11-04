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

/** 分页返回（后端 Pagination 结构） */
export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const DICT_BASE = '/backend-api/v1/dicts'
const ITEM_BASE = '/backend-api/v1/dict-items'

/** 字典列表（全量不分页，keyword 模糊匹配名称/编码） */
export function fetchDicts(keyword?: string): Promise<Dict[]> {
  const search = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  return getApiResult<Dict[]>(`${DICT_BASE}${search}`)
}

export function createDict(values: DictFormValues): Promise<Dict> {
  return getApiResult<Dict>(DICT_BASE, { method: 'POST', body: JSON.stringify(values) })
}

export function updateDict(id: string, values: Partial<DictFormValues>): Promise<Dict> {
  return getApiResult<Dict>(`${DICT_BASE}/${id}`, { method: 'PUT', body: JSON.stringify(values) })
}

export function deleteDict(id: string): Promise<{ deleted: number }> {
  return getApiResult<{ deleted: number }>(`${DICT_BASE}/${id}`, { method: 'DELETE' })
}

/**
 * 字典项列表
 * 页面用客户端分页，这里一次取 200 条（字典项很少超过这个量）
 */
export function fetchDictItems(params: { dictId: string; keyword?: string; status?: number }): Promise<PageResult<DictItem>> {
  const query = new URLSearchParams({ dictId: params.dictId, page: '1', pageSize: '200' })
  if (params.keyword) query.set('keyword', params.keyword)
  if (params.status !== undefined) query.set('status', String(params.status))
  return getApiResult<PageResult<DictItem>>(`${ITEM_BASE}?${query.toString()}`)
}

export function createDictItem(dictId: string, values: DictItemFormValues): Promise<DictItem> {
  return getApiResult<DictItem>(ITEM_BASE, { method: 'POST', body: JSON.stringify({ ...values, dictId }) })
}

export function updateDictItem(id: string, values: Partial<DictItemFormValues>): Promise<DictItem> {
  return getApiResult<DictItem>(`${ITEM_BASE}/${id}`, { method: 'PUT', body: JSON.stringify(values) })
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
