import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const depts = [
  { id: 1, name: '总公司', leader: '张伟', sort: 1, level: 0 },
  { id: 2, name: '技术部', leader: '李娜', sort: 1, level: 1 },
  { id: 3, name: '前端组', leader: '王强', sort: 1, level: 2 },
  { id: 4, name: '后端组', leader: '陈静', sort: 2, level: 2 },
  { id: 5, name: '市场部', leader: '刘洋', sort: 2, level: 1 },
  { id: 6, name: '财务部', leader: '赵敏', sort: 3, level: 1 }
]

export function DeptPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">部门管理</h1>
        <p className="text-muted-foreground text-sm">维护组织架构（mock 数据）</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>部门名称</TableHead>
            <TableHead>负责人</TableHead>
            <TableHead>排序</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {depts.map(dept => (
            <TableRow key={dept.id}>
              <TableCell>{dept.id}</TableCell>
              <TableCell className="font-medium">
                <span style={{ paddingLeft: `${dept.level * 24}px` }}>
                  {dept.level > 0 && <span className="text-muted-foreground mr-1">└</span>}
                  {dept.name}
                </span>
              </TableCell>
              <TableCell>{dept.leader}</TableCell>
              <TableCell>{dept.sort}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
