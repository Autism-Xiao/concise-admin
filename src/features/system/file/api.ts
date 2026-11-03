import { getJson } from '@/lib/http'

export type FileType = 'folder' | 'document' | 'image' | 'spreadsheet' | 'archive' | 'video'

export interface FileItem {
  id: number
  name: string
  type: FileType
  /** 字节数，文件夹为 null */
  size: number | null
  owner: string
  modifiedAt: string
}

export function formatSize(size: number | null): string {
  if (size == null) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} MB`
  return `${(size / 1024 ** 3).toFixed(2)} GB`
}

// 开发环境走 public/mock 下的静态 JSON；接真实后端时改这里即可
export function fetchFiles(): Promise<FileItem[]> {
  return getJson<FileItem[]>('/mock/files.json')
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
