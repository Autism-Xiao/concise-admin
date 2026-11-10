import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { userMessageOf } from '@/lib/api-error'
import { useTenantScope } from '@/context/tenant-scope-provider'
import { fetchMyTenants, type MyTenant } from './api'

/**
 * 租户切换的数据与动作（切换器唯一的逻辑来源）
 *
 * 原来逻辑内嵌在顶栏 TenantSwitcher 按钮里；挪进头像下拉后拆成 hook +
 * Dialog 两个文件：hook 管数据和切换，Dialog 管展示。头像菜单要用它判断
 * 「当前租户是谁 / 是否有得切」，两边共用同一份请求，避免拉两次。
 *
 * 数据源是 `GET /v1/tenants/mine`：普通用户只拿到自己归属的租户，
 * 超管拿全部租户 + 一个「平台视角」（不指定租户，不过滤数据）。
 */
export function useTenantSwitch() {
  const { applySwitch, switching, epoch } = useTenantScope()
  const [tenants, setTenants] = useState<MyTenant[]>([])
  const [isSuper, setIsSuper] = useState(false)
  const [current, setCurrent] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    fetchMyTenants()
      .then(res => {
        if (!alive) return
        setTenants(res?.tenants ?? [])
        setIsSuper(Boolean(res?.isSuper))
        // 后端算出的生效租户优先（首次登录本地还没写过）
        setCurrent(res?.current ?? null)
        setLoaded(true)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
    // 依赖 epoch：切换成功后代次变化，重新拉一次，头像菜单里的「当前租户」跟着更新
  }, [epoch])

  const switchTo = useCallback(
    async (tenantId: number, tenantsList: MyTenant[]) => {
      if (busy || switching) return
      setBusy(true)
      try {
        const applied = await applySwitch(tenantId)
        setCurrent(applied)
        const name = tenantsList.find(item => item.id === applied)?.name
        toast.success(applied ? `已切换到「${name ?? applied}」` : '已回到平台视角')
      } catch (error) {
        toast.error(userMessageOf(error, '切换租户失败'))
      } finally {
        setBusy(false)
      }
    },
    [applySwitch, busy, switching]
  )

  const active = tenants.find(item => item.id === current)
  /** 当前生效的展示名：具体租户 / 平台视角 / 未分配 */
  const currentLabel = active?.name ?? (isSuper ? '平台视角' : '未分配租户')
  /** 只有一个租户且不是超管：没有切换的意义，入口不显示 */
  const switchable = isSuper || tenants.filter(item => item.usable).length > 1

  return { tenants, isSuper, current, currentLabel, switchable, busy, switching, loaded, switchTo }
}
