import { getApiResult } from '@/lib/http'

/** 后端 sys_depart（部门），只保留页面需要的字段 */
export interface Dept {
  id: string
  /** 上级部门 id，null 为顶级 */
  parentId: string | null
  departName: string
  /** 同级排序，越小越靠前 */
  departOrder: number
  /** 部门编码（后端自动生成 A01/A01A01） */
  orgCode?: string | null
  description?: string | null
  /** '1' 正常 / '0' 停用 */
  status?: string
}

export interface DeptWritePayload {
  departName: string
  /** null 为顶级部门；换父由后端防环并同步 orgCode */
  parentId?: string | null
  departOrder?: number
  description?: string | null
}

/** 部门扁平列表（keyword 模糊匹配名称），前端自行组树 */
export function fetchDepts(keyword = ''): Promise<Dept[]> {
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  return getApiResult<Dept[]>(`/backend-api/v1/depts${qs}`)
}

/** 部门树（后端组好层级） */
export function fetchDeptTree(): Promise<Array<Dept & { children: Dept[] }>> {
  return getApiResult<Array<Dept & { children: Dept[] }>>('/backend-api/v1/depts/tree')
}

/** 创建部门（orgCode 由后端自动生成） */
export function createDept(payload: DeptWritePayload): Promise<Dept> {
  return getApiResult<Dept>('/backend-api/v1/depts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function updateDept(id: string, payload: DeptWritePayload): Promise<Dept> {
  return getApiResult<Dept>(`/backend-api/v1/depts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

/** 软删除；有子部门或挂用户时后端会拒绝 */
export function deleteDept(id: string): Promise<void> {
  return getApiResult<null>(`/backend-api/v1/depts/${id}`, { method: 'DELETE' }).then(() => undefined)
}
