import { getApiResult } from '@/lib/http'

/** 参数值类型：决定前端用什么控件渲染 */
export type ConfigValueType = 'string' | 'number' | 'boolean' | 'json'

export interface SystemConfigItem {
  configKey: string
  configValue: string
  valueType: ConfigValueType
  configGroup: string
  name: string
  remark?: string | null
  isBuiltin: number
}

/** 全部参数（可选按分组过滤） */
export function fetchConfigs(group?: string): Promise<SystemConfigItem[]> {
  const qs = group ? `?group=${encodeURIComponent(group)}` : ''
  return getApiResult<SystemConfigItem[]>(`/backend-api/v1/configs${qs}`)
}

/** 分组名列表 */
export function fetchConfigGroups(): Promise<string[]> {
  return getApiResult<string[]>('/backend-api/v1/configs/groups')
}

export interface ConfigUpdateItem {
  configKey: string
  configValue: string
}

/** 批量保存一组参数（整批校验通过才写） */
export function updateConfigsBatch(items: ConfigUpdateItem[]): Promise<{ updated: number }> {
  return getApiResult<{ updated: number }>('/backend-api/v1/configs/batch', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  })
}

/** 刷新后端参数缓存（手工改库后用） */
export function reloadConfigCache(): Promise<{ reloaded: boolean }> {
  return getApiResult<{ reloaded: boolean }>('/backend-api/v1/configs/reload', { method: 'POST' })
}
