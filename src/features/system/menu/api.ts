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
