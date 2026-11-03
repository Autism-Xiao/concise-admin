import { getJson } from '@/lib/http'

export type TenantStatus = '正常' | '停用'
export type TenantPlan = '试用版' | '标准版' | '企业版'

export interface Tenant {
  id: number
  /** 租户（公司）名称 */
  name: string
  /** 租户编码 */
  code: string
  contact: string
  phone: string
  plan: TenantPlan
  /** 到期日期 YYYY-MM-DD */
  expireAt: string
  status: TenantStatus
  remark: string
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchTenants(): Promise<Tenant[]> {
  return getJson<Tenant[]>('/mock/tenants.json')
}

// 开发环境由 vite 中间件写入 public/mock/tenants.json；生产环境换成真实接口
export async function saveTenants(tenants: Tenant[]): Promise<void> {
  const res = await fetch('/api/tenants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tenants)
  })
  if (!res.ok) throw new Error('保存失败')
}
