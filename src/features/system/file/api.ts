import { downloadFromApi } from '@/lib/download'
import { getApiResult, type PageResult } from '@/lib/http'

/** 后端 sys_file 的原始返回（is_folder / is_starred 是 0/1） */
interface RawFile {
  id: number
  parentId: number
  name: string
  isFolder: number
  ext: string
  mime: string
  size: number
  hash?: string
  isStarred: number
  createTime?: string | null
  updateTime?: string | null
  deletedAt?: string | null
}

/** 前端统一用布尔和 ISO 时间，页面里不再到处写 `=== 1` */
export interface FileNode {
  id: number
  parentId: number
  name: string
  isFolder: boolean
  ext: string
  mime: string
  size: number
  starred: boolean
  createTime: string
  updateTime: string
}

export interface BreadcrumbItem {
  id: number
  name: string
}

export interface FileKindStat {
  kind: string
  label: string
  bytes: number
  count: number
}

export interface FileStats {
  totalBytes: number
  fileCount: number
  folderCount: number
  quotaBytes: number
  byKind: FileKindStat[]
}

export interface UploadResult {
  skipped: boolean
  file?: FileNode
  message: string
}

export type ConflictMode = 'rename' | 'skip' | 'overwrite'

const API = '/backend-api/v1/files'

function toNode(raw: RawFile): FileNode {
  return {
    id: Number(raw.id),
    parentId: Number(raw.parentId ?? 0),
    name: raw.name,
    isFolder: Number(raw.isFolder) === 1,
    ext: raw.ext ?? '',
    mime: raw.mime ?? '',
    size: Number(raw.size ?? 0),
    starred: Number(raw.isStarred) === 1,
    createTime: raw.createTime ?? '',
    updateTime: raw.updateTime ?? raw.createTime ?? ''
  }
}

/** 字节数格式化：列表、卡片、存储进度条共用 */
export function formatSize(size: number | null | undefined): string {
  if (size == null) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 ** 3) {
    const mb = size / 1024 ** 2
    return `${mb % 1 === 0 ? mb : mb.toFixed(1)} MB`
  }
  return `${(size / 1024 ** 3).toFixed(2)} GB`
}

/** 相对时间：x 分钟前 / 大约 x 小时前 / x 天前 */
export function formatRelativeTime(iso: string): string {
  if (!iso) return '-'
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `大约 ${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return iso.slice(0, 10)
}

export interface FileListParams {
  parentId?: number
  keyword?: string
  kind?: 'all' | 'image' | 'document' | 'video' | 'audio' | 'other'
  starred?: boolean
  sort?: 'name' | 'size' | 'time'
  order?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

/** 当前目录列表（starred=true 时是跨目录的星标视图） */
export async function fetchFiles(params: FileListParams = {}): Promise<PageResult<FileNode>> {
  const qs = new URLSearchParams()
  if (params.parentId) qs.set('parentId', String(params.parentId))
  if (params.keyword?.trim()) qs.set('keyword', params.keyword.trim())
  if (params.kind && params.kind !== 'all') qs.set('kind', params.kind)
  if (params.starred) qs.set('starred', 'true')
  if (params.sort) qs.set('sort', params.sort)
  if (params.order) qs.set('order', params.order)
  qs.set('page', String(params.page ?? 1))
  qs.set('pageSize', String(params.pageSize ?? 20))

  const res = await getApiResult<PageResult<RawFile>>(`${API}?${qs.toString()}`)
  return { ...res, records: res.records.map(toNode) }
}

/** 面包屑：从「全部文件」到当前目录 */
export function fetchBreadcrumb(folderId: number): Promise<BreadcrumbItem[]> {
  return getApiResult<BreadcrumbItem[]>(`${API}/breadcrumb?folderId=${folderId}`)
}

/** 存储用量（左栏存储卡） */
export function fetchFileStats(): Promise<FileStats> {
  return getApiResult<FileStats>(`${API}/stats`)
}

/** 最近修改的文件 */
export async function fetchRecentFiles(limit = 4): Promise<FileNode[]> {
  const rows = await getApiResult<RawFile[]>(`${API}/recent?limit=${limit}`)
  return rows.map(toNode)
}

export async function createFolder(parentId: number, name: string): Promise<FileNode> {
  const raw = await getApiResult<RawFile>(`${API}/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentId, name })
  })
  return toNode(raw)
}

export async function updateFile(id: number, payload: { name?: string; parentId?: number; starred?: boolean }): Promise<FileNode> {
  const raw = await getApiResult<RawFile>(`${API}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return toNode(raw)
}

export function deleteFile(id: number): Promise<{ deleted: number }> {
  return getApiResult<{ deleted: number }>(`${API}/${id}`, { method: 'DELETE' })
}

export function batchDeleteFiles(ids: number[]): Promise<{ deleted: number }> {
  return getApiResult<{ deleted: number }>(`${API}/batch-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: ids.map(String) })
  })
}

/**
 * 上传文件
 *
 * 用 XHR 而不是 fetch：只有 XHR 能拿到 upload.onprogress，大文件才有进度可看；
 * fetch 的 FormData 上传目前没有统一的进度事件。
 */
export function uploadFile(
  file: File,
  options: { parentId?: number; onConflict?: ConflictMode; onProgress?: (percent: number) => void } = {}
): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)
  form.append('parentId', String(options.parentId ?? 0))
  if (options.onConflict) form.append('onConflict', options.onConflict)

  const token = localStorage.getItem('concise-token') ?? ''
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API}/upload`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = event => {
      if (event.lengthComputable && options.onProgress) {
        options.onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }
    xhr.onload = () => {
      let body: { code?: number; message?: string; result?: UploadResult }
      try {
        body = JSON.parse(xhr.responseText) as { code?: number; message?: string; result?: UploadResult }
      } catch {
        reject(new Error(`上传失败（HTTP ${xhr.status}）：后端返回了非 JSON 响应`))
        return
      }
      if (body.code === 0 && body.result) {
        const result = body.result
        resolve({ ...result, file: result.file ? toNode(result.file as unknown as RawFile) : undefined })
        return
      }
      reject(new Error(body.message || `上传失败（HTTP ${xhr.status}）`))
    }
    xhr.onerror = () => reject(new Error('网络异常，上传失败'))
    xhr.onabort = () => reject(new Error('上传已取消'))
    xhr.send(form)
  })
}

/** 下载：走后端流式接口，文件名从 Content-Disposition 取（后端已做 UTF-8 编码） */
export async function downloadFile(node: FileNode): Promise<void> {
  const { filename, blob } = await downloadFromApi(`/v1/files/${node.id}/download`, node.name)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
