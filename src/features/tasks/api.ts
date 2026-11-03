import { getJson } from '@/lib/http'

export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'canceled'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  assignee: string
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchTasks(): Promise<Task[]> {
  return getJson<Task[]>('/mock/tasks.json')
}
