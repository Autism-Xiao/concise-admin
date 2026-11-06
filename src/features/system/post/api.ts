import { batchDeleteRequest, type BatchDeleteResult } from '@/lib/batch-delete'
import { downloadFromApi } from '@/lib/download'
import type { ImportResult } from '@/components/excel-import-dialog'
import { getApiResult, type PageResult } from '@/lib/http'

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

/** 岗位列表（统一分页结构，全量返回；keyword 模糊匹配名称/编码/描述，可按部门过滤） */
export async function fetchPosts(keyword = '', deptId = ''): Promise<Post[]> {
  const params = new URLSearchParams()
  if (keyword) params.set('keyword', keyword)
  if (deptId) params.set('deptId', deptId)
  const qs = params.toString()
  const page = await getApiResult<PageResult<Post>>(`/backend-api/v1/posts${qs ? `?${qs}` : ''}`)
  return page.records
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

/* ---------- 导入导出（/api/v1/posts/export | import-template | import） ---------- */

/** 导出岗位 Excel（与列表同筛选条件） */
export function exportPosts(params: { keyword?: string; deptId?: string } = {}): Promise<{ filename: string; blob: Blob }> {
  const qs = new URLSearchParams()
  if (params.keyword) qs.set('keyword', params.keyword)
  if (params.deptId) qs.set('deptId', params.deptId)
  const query = qs.toString()
  return downloadFromApi(`/v1/posts/export${query ? `?${query}` : ''}`, 'posts.xlsx')
}

/** 下载岗位导入模板 */
export function downloadPostTemplate(): Promise<{ filename: string; blob: Blob }> {
  return downloadFromApi('/v1/posts/import-template', 'posts-import-template.xlsx')
}

/** 导入岗位（按岗位编码新增或更新） */
export function importPosts(file: File): Promise<ImportResult> {
  const form = new FormData()
  form.append('file', file)
  return getApiResult<ImportResult>('/backend-api/v1/posts/import', { method: 'POST', body: form })
}

/** 批量删除岗位（后端逐条结算，返回失败原因） */
export function deletePosts(ids: string[]): Promise<BatchDeleteResult> {
  return batchDeleteRequest('posts', ids)
}
