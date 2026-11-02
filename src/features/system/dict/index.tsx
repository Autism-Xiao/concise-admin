import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const dicts = [
  { id: 1, name: '用户性别', type: 'sys_user_sex', status: '正常', remark: '性别字典' },
  { id: 2, name: '用户状态', type: 'sys_user_status', status: '正常', remark: '用户状态列表' },
  { id: 3, name: '菜单状态', type: 'sys_menu_status', status: '正常', remark: '菜单状态列表' },
  { id: 4, name: '操作类型', type: 'sys_oper_type', status: '正常', remark: '操作日志类型' },
  { id: 5, name: '通知类型', type: 'sys_notice_type', status: '停用', remark: '通知公告类型' }
]

export function DictPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">字典管理</h1>
        <p className="text-muted-foreground text-sm">维护系统字典数据（mock 数据）</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>字典名称</TableHead>
            <TableHead>字典类型</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>备注</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dicts.map(dict => (
            <TableRow key={dict.id}>
              <TableCell>{dict.id}</TableCell>
              <TableCell className="font-medium">{dict.name}</TableCell>
              <TableCell className="font-mono text-xs">{dict.type}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    dict.status === '正常' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/15 text-destructive'
                  }`}
                >
                  {dict.status}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">{dict.remark}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
