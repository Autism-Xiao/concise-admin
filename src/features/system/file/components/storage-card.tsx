import { HardDrive } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { StorageInfo } from '../api'

/** 存储空间卡片：总用量进度条 + 分类占比 */
export function StorageCard({ storage }: { storage: StorageInfo | null }) {
  if (!storage) {
    return (
      <Card>
        <CardContent className="py-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    )
  }
  const usedPercent = Math.round((storage.usedGB / storage.totalGB) * 100)
  const remain = storage.totalGB - storage.usedGB

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDrive className="size-4" />
          存储空间
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          已使用 {storage.usedGB} GB / {storage.totalGB} GB
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div className="bg-foreground h-full rounded-full transition-all" style={{ width: `${usedPercent}%` }} />
          </div>
          <p className="text-muted-foreground text-xs">剩余 {remain} GB</p>
        </div>
        <div className="space-y-2.5 border-t pt-3">
          {storage.breakdown.map(item => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span>{item.label}</span>
              <span className="text-muted-foreground tabular-nums">
                <span className="text-foreground font-medium">{item.sizeGB} GB</span>
                <span className="ml-2">{item.percent}%</span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
