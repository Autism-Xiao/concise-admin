import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const logs = [
  { id: 1, user: 'zhangsan', action: '登录系统', ip: '192.168.1.101', time: '2026-11-02 09:12:33', status: '成功' },
  { id: 2, user: 'lisi', action: '新增用户', ip: '192.168.1.102', time: '2026-11-02 09:45:10', status: '成功' },
  { id: 3, user: 'wangwu', action: '登录系统', ip: '192.168.1.103', time: '2026-11-02 10:02:51', status: '失败' },
  { id: 4, user: 'zhangsan', action: '修改角色', ip: '192.168.1.101', time: '2026-11-02 10:30:22', status: '成功' },
  { id: 5, user: 'admin', action: '导出数据', ip: '192.168.1.100', time: '2026-11-02 11:05:47', status: '成功' },
  { id: 6, user: 'lisi', action: '删除菜单', ip: '192.168.1.102', time: '2026-11-02 13:21:08', status: '失败' }
]

export function LogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">日志管理</h1>
        <p className="text-muted-foreground text-sm">系统操作与登录日志（mock 数据）</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>操作人</TableHead>
            <TableHead>操作类型</TableHead>
            <TableHead>IP 地址</TableHead>
            <TableHead>时间</TableHead>
            <TableHead>状态</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map(log => (
            <TableRow key={log.id}>
              <TableCell>{log.id}</TableCell>
              <TableCell className="font-medium">{log.user}</TableCell>
              <TableCell>{log.action}</TableCell>
              <TableCell className="font-mono text-xs">{log.ip}</TableCell>
              <TableCell className="font-mono text-xs">{log.time}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    log.status === '成功' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/15 text-destructive'
                  }`}
                >
                  {log.status}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
