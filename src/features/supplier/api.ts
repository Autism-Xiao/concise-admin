import { getApiResult } from '@/lib/http'

/** 供应商（生成器产物） */
export interface Supplier {
  id: number
  name?: string | null
  contact?: string | null
  level?: number | null
  remark?: string | null
  createdAt: string
  updatedAt: string
}

export interface SupplierListResult {
  records: Supplier[]
  total: number
  current: number
  size: number
  pages: number
}

export function fetchSuppliers(params: { page?: number; pageSize?: number; keyword?: string }) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') qs.set(key, String(value))
  })
  return getApiResult<SupplierListResult>(`/backend-api/v1/suppliers?${qs.toString()}`)
}

export function createSupplier(payload: Partial<Supplier>) {
  return getApiResult<Supplier>('/backend-api/v1/suppliers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function updateSupplier(id: number, payload: Partial<Supplier>) {
  return getApiResult<Supplier>(`/backend-api/v1/suppliers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function deleteSupplier(id: number) {
  return getApiResult<unknown>(`/backend-api/v1/suppliers/${id}`, { method: 'DELETE' })
}
