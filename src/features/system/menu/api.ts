import { getJson } from '@/lib/http'

export type MenuStatus = '正常' | '停用'

export interface Menu {
  id: number
  name: string
  path: string
  sort: number
  status: MenuStatus
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchMenus(): Promise<Menu[]> {
  return getJson<Menu[]>('/mock/menus.json')
}

// 开发环境由 vite 中间件写入 public/mock/menus.json；生产环境换成真实接口
export async function saveMenus(menus: Menu[]): Promise<void> {
  const res = await fetch('/api/menus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(menus)
  })
  if (!res.ok) throw new Error('保存失败')
}
