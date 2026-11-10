import { useState } from 'react'
import { Building2, ChevronsUpDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTenantScope } from '@/context/tenant-scope-provider'
import { TenantSwitchDialog } from './tenant-switch-dialog'

/**
 * 顶栏当前租户角标（点击直接打开切换弹窗）
 *
 * 切换器挪进头像菜单后，当前租户不再常驻可见 —— 这个角标只补「看」这一半：
 * 常驻显示当前租户名，一次点击直达切换弹窗（不用先点头像）。
 * 单租户普通用户 switchable=false 不渲染，与头像菜单的入口规则一致。
 */
export function TenantBadge() {
  const { tenants, isSuper, current, currentLabel, switchable, switching, switchTo } = useTenantScope()
  const [open, setOpen] = useState(false)

  if (!switchable) return null

  return (
    <>
      <Button variant="ghost" size="sm" className="h-8 max-w-44 gap-1.5 px-2 font-normal" disabled={switching} onClick={() => setOpen(true)}>
        {switching ? <Loader2 className="size-4 shrink-0 animate-spin opacity-70" /> : <Building2 className="size-4 shrink-0 opacity-70" />}
        <span className="truncate">{currentLabel}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
      </Button>
      <TenantSwitchDialog
        open={open}
        onOpenChange={setOpen}
        tenants={tenants}
        isSuper={isSuper}
        current={current}
        busy={switching}
        onSwitch={id => void switchTo(id)}
      />
    </>
  )
}
