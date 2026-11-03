import { getJson } from '@/lib/http'

export type FileKind = 'folder' | 'file'

export interface FileItem {
  id: number
  name: string
  type: FileKind
  /** 文件扩展名（pdf/xlsx 等），文件夹为 null */
  ext: string | null
  /** 字节数，文件夹为 null */
  size: number | null
  /** 所有者，文件夹可为空 */
  owner: string
  starred: boolean
  shared: boolean
  /** ISO 时间字符串 */
  modifiedAt: string
}

export interface StorageInfo {
  totalGB: number
  usedGB: number
  breakdown: { label: string; sizeGB: number; percent: number }[]
}

export function formatSize(size: number | null): string {
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

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchFiles(): Promise<FileItem[]> {
  return getJson<FileItem[]>('/mock/files.json')
}

export function fetchStorage(): Promise<StorageInfo> {
  return getJson<StorageInfo>('/mock/files-storage.json')
}

// 开发环境由 vite 中间件写入 public/mock/files.json；生产环境换成真实接口
export async function saveFiles(files: FileItem[]): Promise<void> {
  const res = await fetch('/api/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(files)
  })
  if (!res.ok) throw new Error('保存失败')
}
