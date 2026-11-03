import { getJson } from '@/lib/http'

export type StatTrend = 'up' | 'down'

export interface DashboardStat {
  key: string
  title: string
  value: string
  change: string
  trend: StatTrend
  hint: string
  footnote: string
}

export interface VisitorPoint {
  date: string
  mobile: number
  desktop: number
}

export type DocSection = 'outline' | 'performance' | 'personnel' | 'docs'

export interface DashboardDoc {
  id: number
  section: DocSection
  title: string
  type: string
  status: string
  target: number
  limit: number
  reviewer: string
}

export interface DashboardData {
  stats: DashboardStat[]
  visitors: VisitorPoint[]
  documents: DashboardDoc[]
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchDashboard(): Promise<DashboardData> {
  return getJson<DashboardData>('/mock/dashboard.json')
}
