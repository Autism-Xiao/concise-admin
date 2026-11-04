import { getApiResult } from '@/lib/http'

/** 后端岗位（post_sort 升序，列表每条带所属部门对象） */
export interface Post {
  id: string
  postName: string
  postCode: string
  /** 升序排序 */
  postSort: number
  deptId?: string | null
  /** 列表接口带出的所属部门对象 */
  dept?: { id: string; departName: string } | null
  /** '1' 正常 / '0' 停用 */
  status: string
  description?: string | null
  createTime?: string
}

export interface PostWritePayload {
  postName: string
  postCode: string
  postSort?: number
  deptId?: string | null
  status?: string
  description?: string | null
}

/** 岗位列表（keyword 模糊匹配名称/编码/描述，可按部门过滤） */
export function fetchPosts(keyword = '', deptId = ''): Promise<Post[]> {
  const params = new URLSearchParams()
  if (keyword) params.set('keyword', keyword)
  if (deptId) params.set('deptId', deptId)
  const qs = params.toString()
  return getApiResult<Post[]>(`/backend-api/v1/posts${qs ? `?${qs}` : ''}`)
}

export function createPost(payload: PostWritePayload): Promise<Post> {
  return getApiResult<Post>('/backend-api/v1/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function updatePost(id: string, payload: PostWritePayload): Promise<Post> {
  return getApiResult<Post>(`/backend-api/v1/posts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

/** 删除岗位（硬删，暂无关联数据） */
export function deletePost(id: string): Promise<void> {
  return getApiResult<null>(`/backend-api/v1/posts/${id}`, { method: 'DELETE' }).then(() => undefined)
}
