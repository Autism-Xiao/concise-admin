import { Building2, Check, Globe, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { MyTenant } from '../api'

interface TenantSwitchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 头像菜单持有的同一份 hook 状态（单一实例，切换后自动同步） */
  tenants: MyTenant[]
  isSuper: boolean
  current: number | null
  busy: boolean
  /** 切换动作：解析为 true 表示成功，弹窗随即关闭（失败保持打开，用户可重选） */
  onSwitch: (tenantId: number) => Promise<boolean>
}

/**
 * 切换租户弹窗（头像下拉菜单的「切换租户」入口打开；侧边栏 logo 区走下拉直切，不经此弹窗）
 *
 * 纯展示组件：数据与切换动作来自全局 TenantScopeProvider，保证各处
 * 「当前租户」是同一份状态。
 *
 * 列出可切换的租户 + 超管的「平台视角」，当前项打勾、停用/到期项禁用；
 * 切换成功后**自动关闭**（页面由软切换的快照遮罩过渡），失败则留在弹窗里可重选。
 */
export function TenantSwitchDialog({ open, onOpenChange, tenants, isSuper, current, busy, onSwitch }: TenantSwitchDialogProps) {
  const pick = async (tenantId: number) => {
    const ok = await onSwitch(tenantId)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>切换租户</DialogTitle>
          <DialogDescription>切换后所有业务数据将按所选租户过滤展示</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          {tenants.map(item => (
            <button
              key={item.id}
              type="button"
              disabled={!item.usable || item.id === current || busy}
              onClick={() => void pick(item.id)}
              className="hover:bg-accent flex items-center gap-2.5 rounded-md px-2 py-2 text-left disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Building2 className="text-muted-foreground size-4 shrink-0 opacity-60" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{item.name}</div>
                <div className="text-muted-foreground truncate text-xs">
                  {item.code}
                  {item.usable ? (item.expireAt ? ` · 至 ${item.expireAt}` : ' · 永久') : ' · 已停用/到期'}
                </div>
              </div>
              {item.id === current ? <Check className="text-primary size-4 shrink-0" /> : null}
            </button>
          ))}
          {isSuper ? (
            <>
              <div className="bg-border my-1 h-px" />
              <button
                type="button"
                disabled={current === null || busy}
                onClick={() => void pick(0)}
                className="hover:bg-accent flex items-center gap-2.5 rounded-md px-2 py-2 text-left disabled:cursor-not-allowed disabled:opacity-55"
              >
                <Globe className="text-muted-foreground size-4 shrink-0 opacity-60" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">平台视角</div>
                  <div className="text-muted-foreground truncate text-xs">不做租户过滤，可看全部数据</div>
                </div>
                {current === null ? <Check className="text-primary size-4 shrink-0" /> : null}
              </button>
            </>
          ) : null}
          {busy && (
            <div className="text-muted-foreground mt-1 flex items-center justify-center gap-2 text-xs">
              <Loader2 className="size-3.5 animate-spin" />
              正在切换，页面数据即将刷新…
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
