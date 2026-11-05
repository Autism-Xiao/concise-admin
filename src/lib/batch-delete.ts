import { toast } from 'sonner'
import { getApiResult } from '@/lib/http'

/** 后端批量删除统一返回：成功条数 + 失败明细（失败原因来自各模块自己的业务保护规则） */
export interface BatchDeleteResult {
  deleted: number
  failed: Array<{ id: string; name?: string; reason: string }>
}

/** 单条失败明细最多展示条数，避免几十条原因把 toast 撑爆 */
const MAX_FAILURE_LINES = 3

/**
 * 调用后端批量删除接口
 *
 * 约定：所有资源统一 POST /v1/{resource}/batch-delete，body { ids }。
 * 不再用前端 Promise.all 循环单删——那会产生 N 次请求、N 条操作日志，且部分成功时说不清原因。
 */
export function batchDeleteRequest(resource: string, ids: string[]): Promise<BatchDeleteResult> {
  return getApiResult<BatchDeleteResult>(`/backend-api/v1/${resource}/batch-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  })
}

/** 统一的结果提示：全成功给 success，有失败给 warning 并列出前几条原因 */
export function toastBatchResult(result: BatchDeleteResult, label: string): void {
  if (result.deleted > 0 && !result.failed.length) {
    toast.success(`已删除 ${result.deleted} 个${label}`)
    return
  }
  if (result.deleted > 0 && result.failed.length) {
    const detail = result.failed
      .slice(0, MAX_FAILURE_LINES)
      .map(item => `${item.name ?? item.id}：${item.reason}`)
      .join('；')
    toast.warning(`已删除 ${result.deleted} 个${label}，${result.failed.length} 个失败`, {
      description: result.failed.length > MAX_FAILURE_LINES ? `${detail}；…另有 ${result.failed.length - MAX_FAILURE_LINES} 条` : detail
    })
    return
  }
  const detail = result.failed
    .slice(0, MAX_FAILURE_LINES)
    .map(item => `${item.name ?? item.id}：${item.reason}`)
    .join('；')
  toast.error(`没有${label}被删除`, {
    description: result.failed.length > MAX_FAILURE_LINES ? `${detail}；…另有 ${result.failed.length - MAX_FAILURE_LINES} 条` : detail
  })
}
