import { useEffect, useState } from 'react'
import { Building2, Check, ChevronsUpDown, Globe, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { getTenantId } from '@/lib/auth'
import { userMessageOf } from '@/lib/api-error'
import { useTenantScope } from '@/context/tenant-scope-provider'
import { fetchMyTenants, type MyTenant } from '../api'

/**
 * 顶栏租户切换器
 *
 * 数据源是 `GET /v1/tenants/mine`：普通用户只拿到自己归属的租户，
 * 超管拿全部租户 + 一个「平台视角」（不指定租户，不过滤数据）。
 *
 * 注意：本项目 UI 层是 Base UI（@base-ui/react），不是 Radix ——
 * DropdownMenuItem **没有 `onSelect` 回调**（那是 Radix 的 API），
 * 写 onSelect 会被 React 当成文本选择的合成事件挂到 DOM 上，点击永远不触发。
 * 菜单项的点击处理一律用 `onClick`。
 *
 * 切换走**软切换**（见 `context/tenant-scope-provider.tsx`）：不整页 reload，
 * 只推进租户代次让业务页面重挂重拉，因此水印/主题/锁屏/标签页都不会闪。
 */
export function TenantSwitcher() {
  const { applySwitch, switching } = useTenantScope()
  const [tenants, setTenants] = useState<MyTenant[]>([])
  const [isSuper, setIsSuper] = useState(false)
  const [current, setCurrent] = useState<number | null>(getTenantId())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    fetchMyTenants()
      .then(res => {
        if (!alive) return
        setTenants(res?.tenants ?? [])
        setIsSuper(Boolean(res?.isSuper))
        // 后端算出的生效租户优先（首次登录本地还没写过）
        setCurrent(res?.current ?? null)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  async function handleSwitch(tenantId: number) {
    if (busy || switching) return
    setBusy(true)
    try {
      const applied = await applySwitch(tenantId)
      setCurrent(applied)
      const name = tenants.find(item => item.id === applied)?.name
      toast.success(applied ? `已切换到「${name ?? applied}」` : '已回到平台视角')
    } catch (error) {
      // 不用 window.alert：原生弹窗会阻塞整个页面，且样式与系统提示完全脱节
      toast.error(userMessageOf(error, '切换租户失败'))
    } finally {
      setBusy(false)
    }
  }

  const available = tenants.filter(item => item.usable)
  // 只有一个租户且不是超管：没有切换的意义，不占顶栏位置
  if (!isSuper && available.length <= 1) return null

  const active = tenants.find(item => item.id === current)
  const label = active?.name ?? (isSuper ? '平台视角' : '未分配租户')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 max-w-44 gap-1.5 px-2 font-normal" disabled={busy || switching}>
          {busy || switching ? <Loader2 className="size-4 shrink-0 animate-spin opacity-70" /> : <Building2 className="size-4 shrink-0 opacity-70" />}
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60" align="end" sideOffset={8}>
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">切换租户</DropdownMenuLabel>
        {tenants.map(item => (
          <DropdownMenuItem
            key={item.id}
            disabled={!item.usable || item.id === current}
            onClick={() => void handleSwitch(item.id)}
            className="gap-2"
          >
            <Building2 className="size-4 opacity-60" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">{item.name}</span>
              <span className="text-muted-foreground truncate text-xs">
                {item.code}
                {item.usable ? (item.expireAt ? ` · 至 ${item.expireAt}` : ' · 永久') : ' · 已停用/到期'}
              </span>
            </div>
            {item.id === current ? <Check className="size-4 shrink-0" /> : null}
          </DropdownMenuItem>
        ))}
        {isSuper ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={current === null} onClick={() => void handleSwitch(0)} className="gap-2">
              <Globe className="size-4 opacity-60" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">平台视角</span>
                <span className="text-muted-foreground truncate text-xs">不做租户过滤，可看全部数据</span>
              </div>
              {current === null ? <Check className="size-4 shrink-0" /> : null}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
