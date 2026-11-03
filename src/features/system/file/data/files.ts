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

export const files: FileItem[] = [
  { id: 1, name: '产品文档', type: 'folder', size: null, owner: '张伟', modifiedAt: '2026-10-28 14:32' },
  { id: 2, name: '设计稿备份', type: 'folder', size: null, owner: '李娜', modifiedAt: '2026-10-25 09:12' },
  { id: 3, name: '需求说明书 v2.3.docx', type: 'document', size: 1_842_000, owner: '张伟', modifiedAt: '2026-10-30 17:45' },
  { id: 4, name: '首页改版.psd', type: 'image', size: 58_720_000, owner: '李娜', modifiedAt: '2026-10-29 11:03' },
  { id: 5, name: '三季度销售数据.xlsx', type: 'spreadsheet', size: 936_000, owner: '王强', modifiedAt: '2026-10-27 16:20' },
  { id: 6, name: '发布会议录屏.mp4', type: 'video', size: 482_300_000, owner: '陈静', modifiedAt: '2026-10-26 10:08' },
  { id: 7, name: '接口文档.md', type: 'document', size: 84_500, owner: '王强', modifiedAt: '2026-10-31 09:56' },
  { id: 8, name: '图标资源包.zip', type: 'archive', size: 12_400_000, owner: '李娜', modifiedAt: '2026-10-24 15:37' },
  { id: 9, name: '用户调研报告.docx', type: 'document', size: 2_310_000, owner: '周杰', modifiedAt: '2026-10-22 13:19' },
  { id: 10, name: '团建照片合集.zip', type: 'archive', size: 1_204_600_000, owner: '孙丽', modifiedAt: '2026-10-20 18:44' },
  { id: 11, name: '品牌 Logo 源文件.ai', type: 'image', size: 24_800_000, owner: '李娜', modifiedAt: '2026-10-18 10:27' },
  { id: 12, name: '预算表 2027.xlsx', type: 'spreadsheet', size: 512_000, owner: '赵敏', modifiedAt: '2026-11-01 09:02' }
]

export function formatSize(size: number | null): string {
  if (size == null) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} MB`
  return `${(size / 1024 ** 3).toFixed(2)} GB`
}
