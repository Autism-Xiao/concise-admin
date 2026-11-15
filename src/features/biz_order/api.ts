import { getApiResult } from '@/lib/http'

/** 订单（生成器产物） */
export interface BizOrder {
  id: number
  title?: string | null
  status?: number | null
  amount?: number | null
  signedAt?: string | null
  remark?: string | null
  createBy?: string | null
  updateBy?: string | null
  createdAt: string
  updatedAt: string
}

export type BizOrderWritePayload = Partial<Omit<BizOrder, 'id' | 'createBy' | 'updateBy' | 'createdAt' | 'updatedAt'>>

export function fetchBizOrders(params: { page?: number; pageSize?: number; keyword?: string } = {}) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') qs.set(key, String(value))
  })
  return getApiResult<{ records: BizOrder[]; total: number }>(`/backend-api/v1/biz_orders?${qs.toString()}`)
}

export function createBizOrder(payload: BizOrderWritePayload) {
  return getApiResult<BizOrder>('/backend-api/v1/biz_orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function updateBizOrder(id: number, payload: BizOrderWritePayload) {
  return getApiResult<BizOrder>(`/backend-api/v1/biz_orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function deleteBizOrder(id: number) {
  return getApiResult<unknown>(`/backend-api/v1/biz_orders/${id}`, { method: 'DELETE' })
}
