import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileIcon } from './file-icon'
import { formatRelativeTime, formatSize, type FileItem } from '../api'

interface RecentFilesCardProps {
  files: FileItem[]
  onViewAll: () => void
}

/** 最近文件卡片：展示最近修改的 4 个文件 */
export function RecentFilesCard({ files, onViewAll }: RecentFilesCardProps) {
  const recent = files
    .filter(f => f.type === 'file')
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
    .slice(0, 4)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">最近文件</CardTitle>
        <Button variant="link" size="sm" className="h-auto px-0" onClick={onViewAll}>
          查看全部
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {recent.length === 0 && <p className="text-muted-foreground text-sm">暂无文件</p>}
        {recent.map(file => (
          <div key={file.id} className="flex items-center gap-3">
            <FileIcon item={file} className="size-8 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-muted-foreground text-xs tabular-nums">
                {formatSize(file.size)} · {formatRelativeTime(file.modifiedAt)}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
