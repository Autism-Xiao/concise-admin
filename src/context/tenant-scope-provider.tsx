import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { setTenantId } from '@/lib/auth'
import { getInflightCount } from '@/lib/api-activity'
import { userMessageOf } from '@/lib/api-error'
import { fetchMyTenants, switchTenant, type MyTenant } from '@/features/system/tenant/api'

/**
 * 租户作用域上下文（软切换）
 *
 * 背景：切换租户意味着「几乎每个列表的数据源都变了」。最初的实现是整页
 * `window.location.reload()`，最省心但体感很差 —— 浏览器要重新下载并执行一遍
 * 应用 JS，水印、主题、锁屏、标签页全部重建，本地开发下还会触发 vite 重新编译，
 * 表现为点了之后卡一下、白屏、页面闪。
 *
 * 现在的做法分两步，缺一不可：
 *
 * 1. **不整页刷新**：调 `POST /v1/tenants/switch` 记住选择 → 写 localStorage
 *    （`http.ts` 每次请求现读，后续请求自动带新的 `X-Tenant-Id`）→ `epoch + 1`。
 *    标签页渲染器把 epoch 拼进 key，业务页面重挂载，各自在 `useEffect` 里重新拉数据。
 *    侧边栏、主题、水印、锁屏、设置这些「跟人不跟租户」的东西原地不动。
 *
 * 2. **盖住重挂载的空窗期**：重挂载会让页面回到 loading 初始状态（骨架屏），
 *    从用户视角就是「内容消失一下再出现」。所以推进 epoch 之前先把当前内容区
 *    **克隆成一张快照**盖在原位，等新页面的请求全部结束（`waitForApiIdle`）再淡出。
 *    用户看到的是「旧数据 → 新数据」，中间没有骨架也没有白屏。
 *
 * 回退方式：把本文件 `switchTo` 里的 `applySwitch` 换回 `switchTenant + reload`
 * 即可，本上下文不影响其他逻辑。
 */
export interface TenantSnapshot {
  /** 克隆出来的内容区 HTML */
  html: string
  /** 原内容区的 padding，保证快照排版一致 */
  padding: string
  /** 原内容区滚动位置，快照要跟着上移同样的距离 */
  scrollTop: number
  /** 视口坐标（fixed 定位，不受父级定位与滚动影响） */
  top: number
  left: number
  width: number
  height: number
  /** true = 正在淡出，淡完就卸载 */
  fading: boolean
}

interface TenantScopeValue {
  /** 租户代次：变化即代表当前租户换了，页面用它做 key 强制重挂 */
  epoch: number
  /** 正在切换（顶栏按钮转圈 + 内容区被快照盖住） */
  switching: boolean
  /** 切换期间覆盖在内容区的旧画面快照，null 表示没有 */
  snapshot: TenantSnapshot | null
  /** 执行切换：接口 + localStorage + 推进 epoch，**不整页刷新**；返回后端确认的租户 id */
  applySwitch: (tenantId: number) => Promise<number | null>

  // ---- 我可用的租户信息（GET /v1/tenants/mine，切换后随代次自动刷新） ----
  tenants: MyTenant[]
  isSuper: boolean
  /** 当前生效租户 id，null = 平台视角（仅超管） */
  current: number | null
  /** mine 数据是否已加载（未加载前入口别急着显示/隐藏） */
  tenantInfoLoaded: boolean
  /** 当前生效的展示名：具体租户 / 平台视角 / 未分配 */
  currentLabel: string
  /** 是否值得展示切换入口：超管，或可用租户多于一个 */
  switchable: boolean
  /** 切换并 toast 结果（顶栏角标、头像菜单、弹窗共用同一个动作）；返回是否切换成功，调用方据此关闭弹窗 */
  switchTo: (tenantId: number) => Promise<boolean>
}

const TenantScopeContext = createContext<TenantScopeValue | null>(null)

/** 淡出时长：与 `_authenticated.tsx` 里遮罩的 CSS transition 保持一致 */
const SNAPSHOT_FADE_MS = 140

/** 新页面最长冻结时间，超时无论如何都揭幕，避免某个页面卡住导致遮罩不消失 */
const SNAPSHOT_MAX_HOLD_MS = 2500

/** 无骨架页面（纯表单/静态页）的兜底：请求全空且安静这么久就揭幕 */
const IDLE_CALM_MS = 400

/** 最短冻结时间：新页面刚 commit 的头几帧还没渲染出内容，此时揭幕会露出空白 */
const SNAPSHOT_MIN_HOLD_MS = 60

/**
 * 判断「下层新页面是否已经可以拿出来给用户看」
 *
 * 分两种情况，避免把还在加载的骨架或空表格露出来：
 * - 页面有骨架屏（列表/看板类）：**骨架出现又消失**就说明数据已经渲染到 DOM 了，
 *   立刻揭幕。不能等请求计数归零 —— 开发模式下 React StrictMode 会让 effect 跑两遍，
 *   第二个请求比第一个晚 200ms 才结束，白等一截。
 * - 页面没有骨架（纯表单/静态页）：退回「在途请求归零 + 安静一段时间」。
 * 两条都不满足就等超时，绝不让遮罩卡住。
 */
function isNewContentReady(state: { sawSkeleton: boolean; skeletons: number; textLength: number; idle: boolean; calmFor: number }, elapsed: number): boolean {
  if (elapsed < SNAPSHOT_MIN_HOLD_MS) return false
  if (elapsed >= SNAPSHOT_MAX_HOLD_MS) return true
  if (state.sawSkeleton) return state.skeletons === 0 && state.textLength > 20
  return state.idle && state.calmFor >= IDLE_CALM_MS
}

/**
 * 把当前内容区克隆成快照
 *
 * 必须在推进 epoch **之前**同步调用 —— 那时 React 还没提交新一轮渲染，DOM 仍是旧租户的内容。
 * 克隆的 DOM 保留 class 与结构，样式表照常生效；图表是 SVG（recharts），克隆后依然完整。
 */
function captureMainSnapshot(): TenantSnapshot | null {
  const main = document.querySelector<HTMLElement>('main[data-scroll="main"]')
  if (!main) return null
  const computed = getComputedStyle(main)
  const holder = document.createElement('div')
  holder.style.padding = computed.padding
  for (const child of Array.from(main.children)) {
    holder.appendChild(child.cloneNode(true))
  }
  const rect = main.getBoundingClientRect()
  return {
    html: holder.innerHTML,
    padding: computed.padding,
    scrollTop: main.scrollTop,
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    fading: false
  }
}

export function TenantScopeProvider({ children }: { children: ReactNode }) {
  const [epoch, setEpoch] = useState(0)
  const [switching, setSwitching] = useState(false)
  const [snapshot, setSnapshot] = useState<TenantSnapshot | null>(null)
  // 连续切换时用代次号作废前一次的释放流程，避免旧的定时器提前撤掉新快照
  const releaseTokenRef = useRef(0)

  // ---- 我可用的租户信息：Provider 挂在 _authenticated 内（必已登录），可放心拉取 ----
  const [tenants, setTenants] = useState<MyTenant[]>([])
  const [isSuper, setIsSuper] = useState(false)
  const [current, setCurrent] = useState<number | null>(null)
  const [tenantInfoLoaded, setTenantInfoLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    fetchMyTenants()
      .then(res => {
        if (!alive) return
        setTenants(res?.tenants ?? [])
        setIsSuper(Boolean(res?.isSuper))
        // 后端算出的生效租户优先（首次登录本地还没写过）
        setCurrent(res?.current ?? null)
        setTenantInfoLoaded(true)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
    // 依赖代次：切换成功后重新拉取，所有入口的「当前租户」同步更新
  }, [epoch])

  const releaseSnapshot = useCallback((token: number) => {
    const startedAt = performance.now()
    let calmSince = startedAt
    // 新页面是否用过骨架屏：决定这次揭幕按哪套判据走（见 isNewContentReady 注释）
    let sawSkeleton = false

    const fadeOut = () => {
      setSnapshot(prev => (prev ? { ...prev, fading: true } : prev))
      window.setTimeout(() => {
        if (releaseTokenRef.current !== token) return
        setSnapshot(null)
        setSwitching(false)
      }, SNAPSHOT_FADE_MS)
    }

    // 逐帧检查（而不是定时轮询）：骨架消失的那一帧就能揭幕，不额外多等一个 tick
    const tick = () => {
      if (releaseTokenRef.current !== token) return
      const now = performance.now()
      const idle = getInflightCount() === 0
      if (!idle) calmSince = now

      const main = document.querySelector<HTMLElement>('main[data-scroll="main"]')
      const skeletons = main?.querySelectorAll('[data-slot="skeleton"]').length ?? 0
      const textLength = (main?.innerText ?? '').replace(/\s+/g, '').length
      if (skeletons > 0) sawSkeleton = true

      const ready = isNewContentReady({ sawSkeleton, skeletons, textLength, idle, calmFor: now - calmSince }, now - startedAt)
      if (ready) {
        fadeOut()
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [])

  const applySwitch = useCallback(
    async (tenantId: number) => {
      setSwitching(true)
      try {
        const applied = await switchTenant(tenantId)
        // 先落 localStorage 再推进 epoch：页面重挂时发出的请求必须已经带上新的租户头
        setTenantId(applied)
        // 抓快照也要在推进 epoch 之前：此刻 DOM 还是旧租户的内容
        const snap = captureMainSnapshot()
        const token = ++releaseTokenRef.current
        if (snap) setSnapshot(snap)
        setEpoch(value => value + 1)
        if (snap) {
          releaseSnapshot(token)
        } else {
          // 极端情况（还没渲染出内容区）：没有可盖的东西，直接收尾
          setSwitching(false)
        }
        return applied
      } catch (error) {
        releaseTokenRef.current += 1
        setSnapshot(null)
        setSwitching(false)
        throw error
      }
    },
    [releaseSnapshot]
  )

  /** 带结果提示的切换动作：给 UI 入口用的就是它，不是裸的 applySwitch */
  const switchTo = useCallback(
    async (tenantId: number) => {
      if (switching) return false
      try {
        const applied = await applySwitch(tenantId)
        setCurrent(applied)
        const name = tenants.find(item => item.id === applied)?.name
        toast.success(applied ? `已切换到「${name ?? applied}」` : '已回到平台视角')
        return true
      } catch (error) {
        toast.error(userMessageOf(error, '切换租户失败'))
        return false
      }
    },
    [applySwitch, switching, tenants]
  )

  const active = tenants.find(item => item.id === current)
  const currentLabel = active?.name ?? (isSuper ? '平台视角' : '未分配租户')
  const switchable = isSuper || tenants.filter(item => item.usable).length > 1

  const value = useMemo<TenantScopeValue>(
    () => ({
      epoch,
      switching,
      snapshot,
      applySwitch,
      tenants,
      isSuper,
      current,
      tenantInfoLoaded,
      currentLabel,
      switchable,
      switchTo
    }),
    [epoch, switching, snapshot, applySwitch, tenants, isSuper, current, tenantInfoLoaded, currentLabel, switchable, switchTo]
  )

  return <TenantScopeContext.Provider value={value}>{children}</TenantScopeContext.Provider>
}

export function useTenantScope(): TenantScopeValue {
  const ctx = useContext(TenantScopeContext)
  if (!ctx) throw new Error('useTenantScope must be used within TenantScopeProvider')
  return ctx
}
