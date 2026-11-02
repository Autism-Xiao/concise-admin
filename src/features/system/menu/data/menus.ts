export type MenuStatus = '正常' | '停用'

export interface Menu {
  id: number
  name: string
  path: string
  sort: number
  status: MenuStatus
}

export const menus: Menu[] = [
  { id: 1, name: '仪表盘', path: '/dashboard', sort: 1, status: '正常' },
  { id: 2, name: '任务', path: '/tasks', sort: 2, status: '正常' },
  { id: 3, name: '应用', path: '/apps', sort: 3, status: '正常' },
  { id: 4, name: '聊天', path: '/chats', sort: 4, status: '正常' },
  { id: 5, name: '用户', path: '/users', sort: 5, status: '正常' },
  { id: 6, name: '系统管理', path: '/system', sort: 6, status: '正常' },
  { id: 7, name: '用户管理', path: '/system/users', sort: 7, status: '正常' },
  { id: 8, name: '菜单管理', path: '/system/menu', sort: 8, status: '正常' },
  { id: 9, name: '角色权限', path: '/system/role', sort: 9, status: '正常' },
  { id: 10, name: '部门管理', path: '/system/dept', sort: 10, status: '正常' },
  { id: 11, name: '字典管理', path: '/system/dict', sort: 11, status: '停用' },
  { id: 12, name: '日志管理', path: '/system/log', sort: 12, status: '正常' }
]
