import { getApiResult } from '@/lib/http'

/** 任务状态（对齐 JeecgBoot sys_quartz_job.status）：0 正常（运行中）/ -1 停止 */
export type JobStatus = 0 | -1

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  0: '运行中',
  '-1': '已暂停'
}

/** 一条定时任务（表字段 + 运行时信息） */
export interface JobItem {
  id: string
  jobClassName: string
  cronExpression: string
  parameter?: string | null
  description?: string | null
  status: JobStatus
  createBy?: string | null
  createTime?: string | null
  updateBy?: string | null
  updateTime?: string | null
  /** 上次执行时间（内存态，服务重启后清空） */
  lastRun?: string
  lastResult?: string
  lastSuccess?: boolean
  lastDuration?: number
  /** 下次执行时间（按当前 cron 实时计算，已暂停时为空） */
  nextRun?: string
}

export interface JobPage {
  records: JobItem[]
  total: number
  current: number
  size: number
  pages: number
}

/** 可选执行器（jobClassName 的可选值） */
export interface JobHandlerMeta {
  className: string
  description: string
}

export interface JobWritePayload {
  jobClassName: string
  cronExpression: string
  parameter?: string
  description?: string
  status?: JobStatus
}

export interface JobRunResult {
  success: boolean
  message: string
  duration: number
  trigger: 'cron' | 'manual'
  runAt: string
}

const BASE = '/backend-api/v1/jobs'

/** 任务列表（后端分页，这里取前 100 条，表格内再分页） */
export function fetchJobs(params: { keyword?: string; status?: JobStatus } = {}): Promise<JobPage> {
  const search = new URLSearchParams({ page: '1', pageSize: '100' })
  if (params.keyword) search.set('keyword', params.keyword)
  if (params.status !== undefined) search.set('status', String(params.status))
  return getApiResult<JobPage>(`${BASE}?${search.toString()}`)
}

/** 可用执行器清单 */
export function fetchJobHandlers(): Promise<JobHandlerMeta[]> {
  return getApiResult<JobHandlerMeta[]>(`${BASE}/handlers`)
}

export function createJob(payload: JobWritePayload): Promise<JobItem> {
  return getApiResult<JobItem>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function updateJob(id: string, payload: Partial<JobWritePayload>): Promise<JobItem> {
  return getApiResult<JobItem>(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function deleteJob(id: string): Promise<{ deleted: number }> {
  return getApiResult<{ deleted: number }>(`${BASE}/${id}`, { method: 'DELETE' })
}

/** 启动 */
export function resumeJob(id: string): Promise<JobItem> {
  return getApiResult<JobItem>(`${BASE}/${id}/resume`, { method: 'PUT' })
}

/** 暂停 */
export function pauseJob(id: string): Promise<JobItem> {
  return getApiResult<JobItem>(`${BASE}/${id}/pause`, { method: 'PUT' })
}

/** 立即执行一次（不改启停状态） */
export function runJob(id: string): Promise<JobRunResult> {
  return getApiResult<JobRunResult>(`${BASE}/${id}/run`, { method: 'PUT' })
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
