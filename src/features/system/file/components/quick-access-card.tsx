import { Clock, FolderClosed, Star, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** 视图：目录浏览 / 星标收藏（跨目录）/ 最近文件（跨目录）/ 回收站（跨目录） */
export type FileView = 'browse' | 'starred' | 'recent' | 'recycled'

interface QuickAccessCardProps {
  view: FileView
  fileCount: number
  onSelect: (view: FileView) => void
}

const items: { key: FileView; label: string; icon: typeof Clock; iconClass: string }[] = [
  { key: 'browse', label: '全部文件', icon: FolderClosed, iconClass: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400' },
  { key: 'recent', label: '最近文件', icon: Clock, iconClass: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
  { key: 'starred', label: '星标文件', icon: Star, iconClass: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' },
  { key: 'recycled', label: '回收站', icon: Trash2, iconClass: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' }
]

/** 快速访问：切换右侧列表的视图，点当前项不取消（避免出现"下拉到哪个视图"的歧义） */
export function QuickAccessCard({ view, fileCount, onSelect }: QuickAccessCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">快速访问</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            className={cn(
              'hover:bg-accent flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
              view === item.key && 'bg-accent font-medium'
            )}
          >
            <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', item.iconClass)}>
              <item.icon className="size-4" />
            </span>
            {item.label}
            {item.key === 'browse' && <span className="text-muted-foreground ml-auto tabular-nums">{fileCount}</span>}
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
