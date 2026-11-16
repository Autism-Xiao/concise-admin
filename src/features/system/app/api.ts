import { getApiResult } from '@/lib/http'

/** 应用行（列表返回；secretPrefixes 只是"这把钥匙长这样"的识别前缀，不是密钥） */
export interface AppItem {
  id: string
  appName: string
  clientId: string
  status: string
  scopes: string
  remark: string | null
  createTime: string
  /** 有效密钥版本前缀（如 ["sk_f5725…"]），轮换过就有多个 */
  secretPrefixes: string[]
}

export interface WebhookItem {
  id: string
  event: string
  url: string
  status: string
  appId: string | null
  secret: string
  createTime: string
}

export interface DeliveryItem {
  id: string
  event: string
  status: string
  attempts: number
  responseCode: number | null
  error: string | null
  payload: string | null
  createTime: string
}

/** 创建 / 重置密钥的响应：clientSecret 明文只在这里出现一次 */
export interface SecretOnce {
  clientId: string
  clientSecret: string
  secretPrefix: string
}

interface Page<T> {
  records: T[]
  total: number
}

function parseScopes(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** 应用分页列表 */
export async function fetchApps(page = 1, pageSize = 20): Promise<Page<AppItem>> {
  return getApiResult<Page<AppItem>>(`/backend-api/v1/apps?page=${page}&pageSize=${pageSize}`)
}

/** 创建应用；返回的 secret 要立刻弹窗展示（离开弹窗就再也拿不到） */
export async function createApp(input: { appName: string; scopes: string[]; remark?: string }): Promise<{ app: AppItem; secret: SecretOnce }> {
  return getApiResult<{ app: AppItem; secret: SecretOnce }>('/backend-api/v1/apps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

/** 编辑应用（名称/备注/范围/启停） */
export async function updateApp(
  id: string,
  input: { appName?: string; scopes?: string[]; remark?: string; status?: string }
): Promise<AppItem> {
  return getApiResult<AppItem>(`/backend-api/v1/apps/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export async function deleteApp(id: string): Promise<void> {
  await getApiResult<{ deleted: boolean }>(`/backend-api/v1/apps/${id}`, { method: 'DELETE' })
}

/** 重置密钥：旧版本全部撤销，新密钥明文只此一次 */
export async function resetAppSecret(id: string): Promise<SecretOnce> {
  return getApiResult<SecretOnce>(`/backend-api/v1/apps/${id}/reset-secret`, { method: 'POST' })
}

/* ------------------------------ Webhook ------------------------------ */

export async function fetchWebhooks(page = 1, pageSize = 20): Promise<Page<WebhookItem>> {
  return getApiResult<Page<WebhookItem>>(`/backend-api/v1/webhooks?page=${page}&pageSize=${pageSize}`)
}

export async function createWebhook(input: { event: string; url: string; appId?: string }): Promise<WebhookItem> {
  return getApiResult<WebhookItem>('/backend-api/v1/webhooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export async function updateWebhook(id: string, input: { event?: string; url?: string; status?: string }): Promise<WebhookItem> {
  return getApiResult<WebhookItem>(`/backend-api/v1/webhooks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export async function deleteWebhook(id: string): Promise<void> {
  await getApiResult<{ deleted: boolean }>(`/backend-api/v1/webhooks/${id}`, { method: 'DELETE' })
}

/** 连通性测试：结果异步出现在投递流水里 */
export async function testWebhook(id: string): Promise<void> {
  await getApiResult<{ deliveryIdHint: string }>(`/backend-api/v1/webhooks/${id}/test`, { method: 'POST' })
}

export async function fetchDeliveries(webhookId: string, page = 1, pageSize = 10): Promise<Page<DeliveryItem>> {
  return getApiResult<Page<DeliveryItem>>(`/backend-api/v1/webhooks/${webhookId}/deliveries?page=${page}&pageSize=${pageSize}`)
}

export { parseScopes }
