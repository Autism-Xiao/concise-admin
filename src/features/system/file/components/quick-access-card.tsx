import { Clock, FolderClosed, Share2, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type QuickFilter = 'recent' | 'starred' | 'shared' | 'folders'

interface QuickAccessCardProps {
  counts: Record<QuickFilter, number>
  active: QuickFilter | null
  onSelect: (filter: QuickFilter | null) => void
}

const items: { key: QuickFilter; label: string; icon: typeof Clock; iconClass: string }[] = [
  { key: 'recent', label: '最近文件', icon: Clock, iconClass: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
  { key: 'starred', label: '星标文件', icon: Star, iconClass: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' },
  { key: 'shared', label: '共享文件', icon: Share2, iconClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' },
  { key: 'folders', label: '全部文件夹', icon: FolderClosed, iconClass: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400' }
]

/** 快速访问卡片：点击切换右侧列表的过滤条件，再点一次取消 */
export function QuickAccessCard({ counts, active, onSelect }: QuickAccessCardProps) {
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
            onClick={() => onSelect(active === item.key ? null : item.key)}
            className={cn(
              'hover:bg-accent flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
              active === item.key && 'bg-accent font-medium'
            )}
          >
            <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', item.iconClass)}>
              <item.icon className="size-4" />
            </span>
            {item.label}
            <span className="text-muted-foreground ml-auto tabular-nums">{counts[item.key]}</span>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
