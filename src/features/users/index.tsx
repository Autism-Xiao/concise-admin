import { users, type UserStatus } from './data/users'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const statusMap: Record<UserStatus, { label: string; className: string }> = {
  active: { label: '活跃', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  inactive: { label: '未激活', className: 'bg-muted text-muted-foreground' },
  invited: { label: '已邀请', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  suspended: { label: '已停用', className: 'bg-destructive/15 text-destructive' }
}

export function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">用户管理</h1>
        <p className="text-muted-foreground text-sm">共 {users.length} 个用户（mock 数据）</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>姓名</TableHead>
            <TableHead>用户名</TableHead>
            <TableHead>邮箱</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>角色</TableHead>
            <TableHead>创建时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.id}>
              <TableCell>{user.id}</TableCell>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.username}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusMap[user.status].className}`}>
                  {statusMap[user.status].label}
                </span>
              </TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell>{user.createdAt}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
