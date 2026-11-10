import { RefreshCw, type LucideIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { resolveAvatarUrl } from '@/lib/auth'
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

/** 头像：有头像显示图片，没传/加载失败回落真名首字（渐变底），避免请求 404 图片 */
function AvatarNode({ avatar, name }: { avatar?: string | null; name: string }) {
  return (
    <Avatar className="shadow-primary/25 size-12 shadow-lg">
      <AvatarImage src={resolveAvatarUrl(avatar)} alt={name} />
      <AvatarFallback className="from-primary to-primary/60 text-primary-foreground bg-gradient-to-br text-lg font-semibold">
        {name.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}

/**
 * 欢迎条：
 * - 底色：右侧主色光晕 + 左侧横向渐变，深色主题下避免整块是一张死板的纯色面
 * - 左：头像 + 问候「上午好，XX，开始您一天的工作吧！」，第二行是身份徽标 + 上次登录
 *   （上次登录是安全感知最有用的一行信息：不是自己的登录能立刻发现，数据来自 sys_log）
 * - 右：每个统计做成独立小卡片块，按权限显示，无权限的整块不出现
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
    <Card className="relative overflow-hidden">
      <div
        aria-hidden
        className="bg-primary/15 pointer-events-none absolute -top-28 -right-16 size-72 rounded-full blur-3xl"
      />
      <div
        aria-hidden
        className="from-primary/10 pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r to-transparent"
      />
      {/* CardContent 基础类是 flex-col，这里必须显式 flex-row，否则左右两列会垂直堆叠 */}
      <CardContent className="relative flex flex-row flex-wrap items-center justify-between gap-x-8 gap-y-4 py-6">
        <div className="flex min-w-0 items-center gap-4">
          <AvatarNode avatar={profile.avatar} name={profile.realname || profile.username} />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {greeting()}，{profile.realname}
              <span className="text-muted-foreground font-normal">，开始您一天的工作吧！</span>
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              {identity && (
                <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[11px] font-medium">{identity}</span>
              )}
              <span className="text-muted-foreground truncate">{lastLoginText}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {stats.map(stat => (
            <div
              key={stat.key}
              className="border-border/70 bg-muted/40 flex items-center gap-2.5 rounded-lg border px-3.5 py-2"
            >
              <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
                <stat.icon className="size-4" />
              </span>
              <div className="leading-none">
                <p className="text-base font-semibold tabular-nums">{stat.value}</p>
                <p className="text-muted-foreground mt-1 text-[11px] whitespace-nowrap">{stat.label}</p>
              </div>
            </div>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground size-8 shrink-0"
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
