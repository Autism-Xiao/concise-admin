export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'canceled'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  assignee: string
}

const titles = [
  '优化登录页加载速度',
  '修复表格分页错位',
  '接入用户权限接口',
  '编写仪表盘单元测试',
  '升级依赖到最新版本',
  '设计新的空状态插画',
  '整理接口文档',
  '修复暗色模式对比度',
  '添加数据导出功能',
  '重构侧边栏组件'
]

const statuses: TaskStatus[] = ['todo', 'in-progress', 'done', 'canceled']
const priorities: TaskPriority[] = ['low', 'medium', 'high']
const assignees = ['张伟', '李娜', '王强', '陈静', '刘洋']

export const tasks: Task[] = Array.from({ length: 30 }, (_, i) => ({
  id: `TASK-${String(i + 1).padStart(4, '0')}`,
  title: titles[i % titles.length],
  status: statuses[i % statuses.length],
  priority: priorities[(i * 2) % priorities.length],
  assignee: assignees[i % assignees.length]
}))
