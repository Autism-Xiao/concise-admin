import { getJson } from '@/lib/http'

export type NoticeType = '通知' | '公告'
export type NoticeStatus = '已发布' | '草稿' | '已关闭'

export interface Notice {
  id: number
  title: string
  type: NoticeType
  status: NoticeStatus
  publisher: string
  /** 发布时间，草稿为空字符串 */
  publishAt: string
  content: string
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchNotices(): Promise<Notice[]> {
  return getJson<Notice[]>('/mock/notices.json')
}

// 开发环境由 vite 中间件写入 public/mock/notices.json；生产环境换成真实接口
export async function saveNotices(notices: Notice[]): Promise<void> {
  const res = await fetch('/api/notices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notices)
  })
  if (!res.ok) throw new Error('保存失败')
}
