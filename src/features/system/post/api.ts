import { getJson } from '@/lib/http'

export type PostStatus = '正常' | '停用'

export interface Post {
  id: number
  /** 岗位名称 */
  name: string
  /** 岗位编码 */
  code: string
  /** 所属部门 */
  dept: string
  status: PostStatus
  remark: string
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchPosts(): Promise<Post[]> {
  return getJson<Post[]>('/mock/posts.json')
}

// 开发环境由 vite 中间件写入 public/mock/posts.json；生产环境换成真实接口
export async function savePosts(posts: Post[]): Promise<void> {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(posts)
  })
  if (!res.ok) throw new Error('保存失败')
}
