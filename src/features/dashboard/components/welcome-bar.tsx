import { RefreshCw, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDateTime, greeting, type DashboardProfile } from '../api'

/** 欢迎条右侧的迷你统计（数据由 index.tsx 按权限构造，null 的块不会传进来） */
export interface WelcomeStat {
  key: string
  label: string
  icon: LucideIcon
  value: string
}

interface WelcomeBarProps {
  profile: DashboardProfile
  stats: WelcomeStat[]
  refreshing: boolean
  onRefresh: () => void
}

/** 头像占位：没有头像时用真名首字，避免请求 404 图片 */
function AvatarFallback({ name }: { name: string }) {
  return (
    <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-full text-lg font-semibold">
      {name.slice(0, 1).toUpperCase()}
    </div>
  )
}

/**
 * 欢迎条（参照轻量模板布局）：
 * - 左：头像 + 单行问候「上午好，XX，开始您一天的工作吧！」，第二行小字是身份与上次登录
 *   （上次登录是安全感知最有用的一行信息：不是自己的登录能立刻发现，数据来自 sys_log）
 * - 右：迷你统计块（待办 / 今日登录 / 在线），逐块按权限显示，无权限的不出现
 */
export function WelcomeBar({ profile, stats, refreshing, onRefresh }: WelcomeBarProps) {
  const lastLogin = profile.lastLogin
  const identity = [...profile.roleNames, ...profile.deptNames].filter(Boolean).join(' · ')
  const lastLoginText = lastLogin
    ? [`上次登录 ${formatDateTime(lastLogin.time)}`, lastLogin.ip, lastLogin.browser, lastLogin.location]
        .filter(Boolean)
        .join(' · ')
    : '这是本系统记录到的第一次登录'

  return (
    <Card>
      {/* CardContent 基础类是 flex-col，这里必须显式 flex-row，否则左右两列会垂直堆叠 */}
      <CardContent className="flex flex-row flex-wrap items-center justify-between gap-x-8 gap-y-3 py-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <AvatarFallback name={profile.realname || profile.username} />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {greeting()}，{profile.realname}，开始您一天的工作吧！
            </h1>
            <p className="text-muted-foreground mt-1 truncate text-xs">
              {identity ? `${identity} · ` : ''}
              {lastLoginText}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {stats.map(stat => (
            <div key={stat.key} className="flex items-center gap-2">
              <stat.icon className="text-muted-foreground size-4.5" />
              <div className="leading-tight">
                <p className="text-muted-foreground text-xs whitespace-nowrap">{stat.label}</p>
                <p className="text-sm font-semibold tabular-nums">{stat.value}</p>
              </div>
            </div>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground size-8"
            disabled={refreshing}
            onClick={onRefresh}
            aria-label="刷新概览"
          >
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
