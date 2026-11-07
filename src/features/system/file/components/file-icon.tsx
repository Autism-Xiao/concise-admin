import { File, FileArchive, FileCode, FileImage, FileSpreadsheet, FileText, Film, Folder, Music, Presentation } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FileNode } from '../api'

/** 扩展名 → 图标 + 配色（参考网盘类产品的文件图标风格） */
const extMeta: Record<string, { icon: typeof File; className: string }> = {
  pdf: { icon: FileText, className: 'text-red-500' },
  docx: { icon: FileText, className: 'text-blue-500' },
  doc: { icon: FileText, className: 'text-blue-500' },
  txt: { icon: FileText, className: 'text-muted-foreground' },
  md: { icon: FileText, className: 'text-muted-foreground' },
  pptx: { icon: Presentation, className: 'text-purple-500' },
  ppt: { icon: Presentation, className: 'text-purple-500' },
  xlsx: { icon: FileSpreadsheet, className: 'text-emerald-600' },
  xls: { icon: FileSpreadsheet, className: 'text-emerald-600' },
  csv: { icon: FileSpreadsheet, className: 'text-emerald-600' },
  png: { icon: FileImage, className: 'text-teal-500' },
  jpg: { icon: FileImage, className: 'text-teal-500' },
  jpeg: { icon: FileImage, className: 'text-teal-500' },
  gif: { icon: FileImage, className: 'text-teal-500' },
  webp: { icon: FileImage, className: 'text-teal-500' },
  svg: { icon: FileImage, className: 'text-teal-500' },
  mp4: { icon: Film, className: 'text-violet-500' },
  mov: { icon: Film, className: 'text-violet-500' },
  mp3: { icon: Music, className: 'text-pink-500' },
  wav: { icon: Music, className: 'text-pink-500' },
  zip: { icon: FileArchive, className: 'text-amber-600' },
  rar: { icon: FileArchive, className: 'text-amber-600' },
  '7z': { icon: FileArchive, className: 'text-amber-600' },
  json: { icon: FileCode, className: 'text-cyan-600' },
  js: { icon: FileCode, className: 'text-cyan-600' },
  ts: { icon: FileCode, className: 'text-cyan-600' }
}

export function FileIcon({ item, className }: { item: Pick<FileNode, 'isFolder' | 'ext'>; className?: string }) {
  if (item.isFolder) return <Folder className={cn('fill-amber-400 text-amber-400', className)} />
  const meta = (item.ext && extMeta[item.ext.toLowerCase()]) || { icon: File, className: 'text-muted-foreground' }
  return <meta.icon className={cn(meta.className, className)} />
}
