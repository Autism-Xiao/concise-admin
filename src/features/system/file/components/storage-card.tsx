import { HardDrive } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatSize, type FileStats } from '../api'

/** 存储空间卡片：总用量进度条 + 分类占比（数据来自 GET /v1/files/stats） */
export function StorageCard({ storage }: { storage: FileStats | null }) {
  if (!storage) {
    return (
      <Card>
        <CardContent className="py-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    )
  }

  const quota = storage.quotaBytes || 1
  const usedPercent = Math.min(100, Math.round((storage.totalBytes / quota) * 100))
  const kinds = storage.byKind.filter(item => item.bytes > 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDrive className="size-4" />
          存储空间
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          已使用 {formatSize(storage.totalBytes)} / {formatSize(storage.quotaBytes)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div className="bg-foreground h-full rounded-full transition-all" style={{ width: `${usedPercent}%` }} />
          </div>
          <p className="text-muted-foreground text-xs">
            剩余 {formatSize(Math.max(storage.quotaBytes - storage.totalBytes, 0))} · {storage.fileCount} 个文件 · {storage.folderCount} 个文件夹
          </p>
        </div>
        {kinds.length > 0 && (
          <div className="space-y-2.5 border-t pt-3">
            {kinds.map(item => (
              <div key={item.kind} className="flex items-center justify-between text-sm">
                <span>{item.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  <span className="text-foreground font-medium">{formatSize(item.bytes)}</span>
                  <span className="ml-2">
                    {storage.totalBytes > 0 ? Math.round((item.bytes / storage.totalBytes) * 100) : 0}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
