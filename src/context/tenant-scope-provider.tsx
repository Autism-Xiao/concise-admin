import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { setTenantId } from '@/lib/auth'
import { switchTenant } from '@/features/system/tenant/api'

/**
 * 租户作用域上下文（软切换）
 *
 * 背景：切换租户意味着「几乎每个列表的数据源都变了」。最初的实现是整页
 * `window.location.reload()`，最省心但体感很差 —— 浏览器要重新下载并执行一遍
 * 应用 JS，水印、主题、锁屏、标签页全部重建，本地开发下还会触发 vite 重新编译，
 * 表现为点了之后卡一下、白屏、页面闪。
 *
 * 现在改成「软切换」：
 * 1. 调 `POST /v1/tenants/switch` 记住选择
 * 2. 写 localStorage（`http.ts` 每个请求都现读，后续请求自动带新的 `X-Tenant-Id`）
 * 3. `epoch + 1` —— 标签页渲染器把它拼进 key，所有 keep-alive 页面**重挂载**，
 *    各自在 `useEffect` 里重新拉数据（这就是刷新数据的唯一手段，项目没有全局
 *    数据缓存层，所有页面数据都在组件内部 state）
 * 4. 只有业务数据区重来；侧边栏、主题、水印、锁屏、设置这些「跟人不跟租户」
 *    的东西原地不动，所以不会闪
 *
 * 与整页刷新相比少了：HTML/JS 重新解析执行、Provider 重建、菜单树与权限重算、
 * 水印重绘。页面数据请求本身省不掉（必须重新拉），但那是几百毫秒的局部 loading，
 * 而不是整页白屏。
 *
 * 回退方式：把 `tenant-switcher.tsx` 里 `applySwitch` 换回 `switchTenant + reload`
 * 即可，本上下文不影响其他逻辑。
 */
interface TenantScopeValue {
  /** 租户代次：变化即代表当前租户换了，页面用它做 key 强制重挂 */
  epoch: number
  /** 正在切换（顶栏按钮转圈 + 内容区遮罩，避免旧租户数据被误读） */
  switching: boolean
  /** 执行切换：接口 + localStorage + 推进 epoch，**不整页刷新**；返回后端确认的租户 id */
  applySwitch: (tenantId: number) => Promise<number | null>
}

const TenantScopeContext = createContext<TenantScopeValue | null>(null)

export function TenantScopeProvider({ children }: { children: ReactNode }) {
  const [epoch, setEpoch] = useState(0)
  const [switching, setSwitching] = useState(false)

  const applySwitch = useCallback(async (tenantId: number) => {
    setSwitching(true)
    try {
      const applied = await switchTenant(tenantId)
      // 先落 localStorage 再推进 epoch：页面重挂时发出的请求必须已经带上新的租户头
      setTenantId(applied)
      setEpoch(value => value + 1)
      return applied
    } finally {
      setSwitching(false)
    }
  }, [])

  const value = useMemo<TenantScopeValue>(() => ({ epoch, switching, applySwitch }), [epoch, switching, applySwitch])

  return <TenantScopeContext.Provider value={value}>{children}</TenantScopeContext.Provider>
}

export function useTenantScope(): TenantScopeValue {
  const ctx = useContext(TenantScopeContext)
  if (!ctx) throw new Error('useTenantScope must be used within TenantScopeProvider')
  return ctx
}
