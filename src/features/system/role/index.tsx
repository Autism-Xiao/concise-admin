import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const roles = [
  { id: 1, name: '超级管理员', code: 'superadmin', userCount: 2, createdAt: '2025-01-01', status: '正常' },
  { id: 2, name: '管理员', code: 'admin', userCount: 5, createdAt: '2025-02-12', status: '正常' },
  { id: 3, name: '运营', code: 'operator', userCount: 12, createdAt: '2025-03-08', status: '正常' },
  { id: 4, name: '访客', code: 'guest', userCount: 31, createdAt: '2025-05-20', status: '停用' }
]

export function RolePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">角色权限</h1>
        <p className="text-muted-foreground text-sm">维护角色与权限分配（mock 数据）</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>角色名称</TableHead>
            <TableHead>权限字符</TableHead>
            <TableHead>用户数</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead>状态</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map(role => (
            <TableRow key={role.id}>
              <TableCell>{role.id}</TableCell>
              <TableCell className="font-medium">{role.name}</TableCell>
              <TableCell className="font-mono text-xs">{role.code}</TableCell>
              <TableCell>{role.userCount}</TableCell>
              <TableCell>{role.createdAt}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    role.status === '正常' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/15 text-destructive'
                  }`}
                >
                  {role.status}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
