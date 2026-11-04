import { getApiResult } from '@/lib/http'

/** 后端职级（level_rank 降序 = 级别从高到低） */
export interface Level {
  id: string
  /** 职级名称，如 P6 / M1 */
  levelName: string
  /** 数字越大级别越高 */
  levelRank: number
  /** '1' 正常 / '0' 停用 */
  status: string
  remark?: string | null
  createTime?: string
}

export interface LevelWritePayload {
  levelName: string
  levelRank: number
  status?: string
  remark?: string | null
}

/** 职级列表（keyword 模糊匹配名称/备注） */
export function fetchLevels(keyword = ''): Promise<Level[]> {
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  return getApiResult<Level[]>(`/backend-api/v1/levels${qs}`)
}

export function createLevel(payload: LevelWritePayload): Promise<Level> {
  return getApiResult<Level>('/backend-api/v1/levels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function updateLevel(id: string, payload: LevelWritePayload): Promise<Level> {
  return getApiResult<Level>(`/backend-api/v1/levels/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

/** 删除职级（硬删，暂无关联数据） */
export function deleteLevel(id: string): Promise<void> {
  return getApiResult<null>(`/backend-api/v1/levels/${id}`, { method: 'DELETE' }).then(() => undefined)
}
