import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const menus = [
  { id: 1, name: '仪表盘', path: '/dashboard', sort: 1, status: '正常' },
  { id: 2, name: '系统管理', path: '/system', sort: 2, status: '正常' },
  { id: 3, name: '用户管理', path: '/system/users', sort: 3, status: '正常' },
  { id: 4, name: '菜单管理', path: '/system/menu', sort: 4, status: '正常' },
  { id: 5, name: '角色权限', path: '/system/role', sort: 5, status: '正常' },
  { id: 6, name: '字典管理', path: '/system/dict', sort: 6, status: '停用' }
]

export function MenuPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">菜单管理</h1>
        <p className="text-muted-foreground text-sm">维护系统菜单与路由（mock 数据）</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>菜单名称</TableHead>
            <TableHead>路由地址</TableHead>
            <TableHead>排序</TableHead>
            <TableHead>状态</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {menus.map(menu => (
            <TableRow key={menu.id}>
              <TableCell>{menu.id}</TableCell>
              <TableCell className="font-medium">{menu.name}</TableCell>
              <TableCell className="font-mono text-xs">{menu.path}</TableCell>
              <TableCell>{menu.sort}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    menu.status === '正常' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/15 text-destructive'
                  }`}
                >
                  {menu.status}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
