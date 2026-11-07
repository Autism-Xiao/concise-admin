import { useEffect, useState } from 'react'
import { Building2, Check, ChevronsUpDown, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { getTenantId, setTenantId } from '@/lib/auth'
import { fetchMyTenants, switchTenant, type MyTenant } from '../api'

/**
 * 顶栏租户切换器
 *
 * 数据源是 `GET /v1/tenants/mine`：普通用户只拿到自己归属的租户，
 * 超管拿全部租户 + 一个「平台视角」（不指定租户，不过滤数据）。
 *
 * 切换后**整页重载**：租户变了意味着几乎每个列表的数据源都变了，
 * 局部刷新容易留下上一个租户的缓存（表格分页、下拉字典、首页统计），
 * 重载最省心也不会错。
 */
export function TenantSwitcher() {
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
    if (busy) return
    setBusy(true)
    try {
      const applied = await switchTenant(tenantId)
      setTenantId(applied)
      window.location.reload()
    } catch (error) {
      setBusy(false)
      window.alert(error instanceof Error ? error.message : '切换租户失败')
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
        <Button variant="ghost" size="sm" className="h-8 max-w-44 gap-1.5 px-2 font-normal" disabled={busy}>
          <Building2 className="size-4 shrink-0 opacity-70" />
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
            onSelect={() => void handleSwitch(item.id)}
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
            <DropdownMenuItem disabled={current === null} onSelect={() => void handleSwitch(0)} className="gap-2">
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
