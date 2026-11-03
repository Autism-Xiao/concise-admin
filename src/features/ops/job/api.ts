import { getJson } from '@/lib/http'

export type JobStatus = '运行中' | '已暂停'

export interface JobItem {
  id: number
  name: string
  cron: string
  status: JobStatus
  lastRun: string
  nextRun: string
  description: string
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchJobs(): Promise<JobItem[]> {
  return getJson<JobItem[]>('/mock/ops-jobs.json')
}
