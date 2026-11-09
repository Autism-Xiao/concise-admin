import { getApiResult, type PageResult } from '@/lib/http'

/** 优先级：0 低 / 1 中 / 2 高 */
export type TaskPriority = 0 | 1 | 2
/** 状态：0 待处理 / 1 进行中 / 2 已完成 / 3 已取消 */
export type TaskStatus = 0 | 1 | 2 | 3

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = { 0: '低', 1: '中', 2: '高' }
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = { 0: '待处理', 1: '进行中', 2: '已完成', 3: '已取消' }

/** 状态机：与后端 task.service 的 STATUS_TRANSITIONS 保持一致（前端只用来决定显示哪些按钮） */
export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  0: [1, 3],
  1: [2, 3],
  2: [],
  3: [0]
}

/** 未指派的哨兵值（后端约定 assignee_id = '0' 表示没有负责人） */
export const TASK_UNASSIGNED = '0'

export interface Task {
  id: number
  tenantId?: number
  title: string
  description?: string | null
  priority: TaskPriority
  status: TaskStatus
  /** 负责人用户 ID（sys_user.id 字符串主键），'0' 为未指派 */
  assigneeId: string
  /** 负责人姓名（后端随列表附带；用户已删时为空） */
  assigneeName?: string
  dueDate?: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskListParams {
  page?: number
  pageSize?: number
  keyword?: string
  priority?: TaskPriority
  status?: TaskStatus
  assigneeId?: string
}

export interface TaskWritePayload {
  title: string
  description?: string
  priority?: TaskPriority
  assigneeId?: string
  /** ISO 8601；传 null 表示清空截止时间 */
  dueDate?: string | null
}

/** 任务分页列表（需要 system:task:list） */
export function fetchTasks(params: TaskListParams = {}): Promise<PageResult<Task>> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params.keyword?.trim()) qs.set('keyword', params.keyword.trim())
  if (params.priority !== undefined) qs.set('priority', String(params.priority))
  if (params.status !== undefined) qs.set('status', String(params.status))
  if (params.assigneeId) qs.set('assigneeId', params.assigneeId)
  const query = qs.toString()
  return getApiResult<PageResult<Task>>(`/backend-api/v1/tasks${query ? `?${query}` : ''}`)
}

/** 我负责的任务（登录即可，不要求 system:task:list） */
export function fetchMyTasks(params: { page?: number; pageSize?: number; status?: TaskStatus } = {}): Promise<PageResult<Task>> {
  return fetchTasksBy('/backend-api/v1/tasks/mine', params)
}

function fetchTasksBy(path: string, params: { page?: number; pageSize?: number; status?: TaskStatus }): Promise<PageResult<Task>> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params.status !== undefined) qs.set('status', String(params.status))
  const query = qs.toString()
  return getApiResult<PageResult<Task>>(`${path}${query ? `?${query}` : ''}`)
}

export function createTask(payload: TaskWritePayload): Promise<Task> {
  return getApiResult<Task>('/backend-api/v1/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
}

export function updateTask(id: number, payload: TaskWritePayload): Promise<Task> {
  return getApiResult<Task>(`/backend-api/v1/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
}

/** 状态流转：非法流转后端返回 400 并带原因（如「任务不能从「已完成」变更为「进行中」」） */
export function changeTaskStatus(id: number, status: TaskStatus): Promise<Task> {
  return getApiResult<Task>(`/backend-api/v1/tasks/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
}

export function deleteTask(id: number): Promise<void> {
  return getApiResult<void>(`/backend-api/v1/tasks/${id}`, { method: 'DELETE' })
}

/* ------------------------------- 展示格式化 ------------------------------- */

/** 截止时间 → 「已逾期 / 今天 / 还剩 N 天」，null 返回 null 由调用方显示「—」 */
export function describeDueDate(due: string | null | undefined): { text: string; overdue: boolean } | null {
  if (!due) return null
  const target = new Date(due)
  if (Number.isNaN(target.getTime())) return null
  const now = new Date()
  const dayMs = 24 * 60 * 60 * 1000
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOf(target) - startOf(now)) / dayMs)
  if (days < 0) return { text: `已逾期 ${-days} 天`, overdue: true }
  if (days === 0) return { text: '今天到期', overdue: false }
  if (days === 1) return { text: '明天到期', overdue: false }
  return { text: `还剩 ${days} 天`, overdue: false }
}

/** ISO 时间 → 2026-11-07 11:58 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
