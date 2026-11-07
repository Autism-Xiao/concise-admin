import { CloudOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSettings } from '@/context/settings-provider'

/**
 * 设置同步状态提示
 *
 * 刻意只在「非已同步」时出现：
 *  - pending：改完立刻显示「保存中」，让用户知道改动正在写云端
 *  - local：接口挂了 —— 明确告诉用户「已存在本机」，并提供重试，避免以为设置没保存上
 * 已同步时不占位置，设置页保持干净。
 */
export function SettingsSyncBadge() {
  const { syncState, retrySync } = useSettings()

  if (syncState === 'synced') return null

  if (syncState === 'pending') {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
        <Loader2 className="size-3.5 animate-spin" />
        正在保存…
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400">
      <CloudOff className="size-3.5 shrink-0" />
      <span>云端保存失败，设置已保存在本机</span>
      <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={retrySync}>
        重试
      </Button>
    </div>
  )
}
