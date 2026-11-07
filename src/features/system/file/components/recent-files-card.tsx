import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileIcon } from './file-icon'
import { formatRelativeTime, formatSize, type FileNode } from '../api'

interface RecentFilesCardProps {
  files: FileNode[]
  onViewAll: () => void
  onOpen: (file: FileNode) => void
}

/** 最近文件卡片：后端已按修改时间倒序且只返回文件，这里只负责展示 */
export function RecentFilesCard({ files, onViewAll, onOpen }: RecentFilesCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">最近文件</CardTitle>
        <Button variant="link" size="sm" className="h-auto px-0" onClick={onViewAll}>
          查看全部
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {files.length === 0 && <p className="text-muted-foreground text-sm">还没有上传过文件</p>}
        {files.map(file => (
          <button
            key={file.id}
            type="button"
            onClick={() => onOpen(file)}
            className="hover:bg-accent/60 -mx-1 flex w-[calc(100%+0.5rem)] items-center gap-3 rounded-md px-1 py-1 text-left transition-colors"
          >
            <FileIcon item={file} className="size-8 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-muted-foreground text-xs tabular-nums">
                {formatSize(file.size)} · {formatRelativeTime(file.updateTime)}
              </p>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
