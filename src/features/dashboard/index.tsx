import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Info, LogIn, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { isPathAllowed, usePermittedPaths } from '@/lib/permissions'
import { fetchOverview, type DashboardOverview } from './api'
// recharts 体积大（构建后约 300K+）且只有登录趋势图在用：懒加载把它单独拆成异步 chunk，
// 首屏骨架阶段不用下载解析图表库，dashboard 主 chunk 相应瘦身
const LoginTrendChart = lazy(() => import('./components/login-trend-chart').then(m => ({ default: m.LoginTrendChart })))
import { MetricCards } from './components/metric-cards'
import { MyTasksCard } from './components/my-tasks-card'
import { NoticesCard } from './components/notices-card'
import { QuickEntriesCard } from './components/quick-entries-card'
import { RecentOpersCard } from './components/recent-opers-card'
import { ServerStateCard } from './components/server-state-card'
import { WelcomeBar, type WelcomeStat } from './components/welcome-bar'

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex items-center gap-3 py-5">
          <Skeleton className="size-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-52" />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))' }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-2 py-5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        <Card className="min-w-0 xl:col-span-2">
          <CardContent className="py-5">
            <Skeleton className="h-48 w-full sm:h-56" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 py-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * 首页
 *
 * 数据来自单个聚合接口 /v1/dashboard/overview —— 权限裁剪由服务端完成，
 * 前端只做「有就画、null 就跳过」，不参与任何权限判断（localStorage 里的权限可被篡改）。
 * 因此低权限账号看到的不是「一堆 0」，而是「更少的卡片」，并且每块都标注了口径（全站 / 仅我的）。
 */
export function DashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  // 首次加载与手动刷新要分开：刷新时保留旧内容，避免整页闪 skeleton
  const loadedRef = useRef(false)

  const load = useCallback(async () => {
    if (loadedRef.current) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const overview = await fetchOverview()
      setData(overview)
      loadedRef.current = true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '加载失败')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const go = useCallback(
    (path: string) => {
      void navigate({ to: path as never })
    },
    [navigate]
  )

  // 卡片上的跳转入口与快捷入口同一套门槛：目标页不在当前角色菜单范围内就不渲染按钮，
  // 避免访客点「通知公告」被甩到 403（permitted 为 null = 超管 / 加载中，放行）
  const permitted = usePermittedPaths()
  const canGo = useMemo(() => {
    const check = (path: string) => !permitted || isPathAllowed(path, permitted)
    return { notices: check('/system/notice'), logs: check('/system/log/operation'), tasks: check('/system/task') }
  }, [permitted])

  // 欢迎条右侧的迷你统计：逐块按权限构造（null 的块不出现，与下方卡片同一份数据）
  const welcomeStats = useMemo<WelcomeStat[]>(() => {
    if (!data) return []
    const stats: WelcomeStat[] = []
    if (data.todayLogin) {
      stats.push({
        key: 'todayLogin',
        label: data.todayLogin.scope === 'all' ? '今日登录' : '今日登录（我的）',
        icon: LogIn,
        value: data.todayLogin.success.toLocaleString()
      })
    }
    if (data.onlineCount !== null) {
      stats.push({ key: 'onlineCount', label: '在线', icon: UserCheck, value: data.onlineCount.toLocaleString() })
    }
    return stats
  }, [data])

  if (loading) return <DashboardSkeleton />

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <p className="text-muted-foreground max-w-lg text-center text-sm">{error}</p>
          <Button variant="outline" onClick={() => void load()}>
            重试
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  // 四个「全站级」块全为 null：说明这个账号没有任何菜单授权，只剩「我的」数据
  const restricted =
    data.userTotal === null && data.onlineCount === null && data.roleTotal === null && data.serverState === null

  return (
    <div className="space-y-6">
      <WelcomeBar profile={data.profile} stats={welcomeStats} refreshing={refreshing} onRefresh={() => void load()} />

      {restricted && (
        <div className="text-muted-foreground flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            当前账号还没有被分配菜单，因此只能看到属于你自己的数据。请联系管理员在「角色权限」里为你的角色勾选菜单与按钮。
          </span>
        </div>
      )}

      <MetricCards data={data} />

      {/* 列项必须 min-w-0：grid 轨道默认 min-width:auto，图表 SVG 的像素宽度会把轨道撑爆，
          表现为移动端整列横向溢出（图 + 图下面的卡片一起超宽） */}
      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        <div className="min-w-0 space-y-4 xl:col-span-2">
          {data.loginTrend && (
            <Suspense
              fallback={
                <Card>
                  <CardContent className="py-5">
                    <Skeleton className="h-48 w-full sm:h-56" />
                  </CardContent>
                </Card>
              }
            >
              <LoginTrendChart block={data.loginTrend} />
            </Suspense>
          )}
          {data.recentOpers && (
            <RecentOpersCard block={data.recentOpers} onOpenLogs={() => go('/system/log/operation')} canOpenLogs={canGo.logs} />
          )}
        </div>
        <div className="min-w-0 space-y-4">
          <MyTasksCard block={data.myTasks} onOpenTasks={() => go('/system/task')} canOpenTasks={canGo.tasks} />
          <NoticesCard rows={data.notices} onOpenNotices={() => go('/system/notice')} canOpenNotices={canGo.notices} />
          <QuickEntriesCard onNavigate={go} />
          {data.serverState && <ServerStateCard block={data.serverState} onOpenMonitor={() => go('/ops/server')} />}
        </div>
      </div>
    </div>
  )
}
