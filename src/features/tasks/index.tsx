import { tasks, type TaskPriority, type TaskStatus } from './data/tasks'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const statusMap: Record<TaskStatus, string> = {
  todo: '待处理',
  'in-progress': '进行中',
  done: '已完成',
  canceled: '已取消'
}

const priorityMap: Record<TaskPriority, { label: string; className: string }> = {
  low: { label: '低', className: 'bg-muted text-muted-foreground' },
  medium: { label: '中', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  high: { label: '高', className: 'bg-destructive/15 text-destructive' }
}

export function TasksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">任务</h1>
        <p className="text-muted-foreground text-sm">共 {tasks.length} 个任务（mock 数据）</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>编号</TableHead>
            <TableHead>标题</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>优先级</TableHead>
            <TableHead>负责人</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map(task => (
            <TableRow key={task.id}>
              <TableCell className="font-mono text-xs">{task.id}</TableCell>
              <TableCell className="font-medium">{task.title}</TableCell>
              <TableCell>{statusMap[task.status]}</TableCell>
              <TableCell>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityMap[task.priority].className}`}>
                  {priorityMap[task.priority].label}
                </span>
              </TableCell>
              <TableCell>{task.assignee}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
