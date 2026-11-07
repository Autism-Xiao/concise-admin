import { Bell, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDateTime, greeting, type DashboardProfile } from '../api'

interface WelcomeBarProps {
  profile: DashboardProfile
  noticeCount: number
  refreshing: boolean
  onRefresh: () => void
  onOpenNotices: () => void
  /** 目标页面（/system/notice）是否在当前角色菜单范围内 */
  canOpenNotices?: boolean
}

/** 头像占位：没有头像时用真名首字，避免请求 404 图片 */
function AvatarFallback({ name }: { name: string }) {
  return (
    <div className="bg-primary/10 text-primary flex size-14 shrink-0 items-center justify-center rounded-full text-xl font-semibold">
      {name.slice(0, 1).toUpperCase()}
    </div>
  )
}

/** 今天（本地时区）：2026-11-07 星期六 */
function todayLabel(): string {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mm}-${dd} 星期${'日一二三四五六'[now.getDay()]}`
}

/**
 * 欢迎条：问候 + 身份 + 今天 + 上次登录
 *
 * 「上次登录」是安全感知最有用的一行信息（不是自己的登录能立刻发现），
 * 数据来自 sys_log 里该账号最近一条成功登录。
 */
export function WelcomeBar({ profile, noticeCount, refreshing, onRefresh, onOpenNotices, canOpenNotices = true }: WelcomeBarProps) {
  const lastLogin = profile.lastLogin
  const loginMeta = lastLogin
    ? [formatDateTime(lastLogin.time), lastLogin.ip, lastLogin.browser, lastLogin.location].filter(Boolean).join(' · ')
    : '这是本系统记录到的第一次登录'

  return (
    <Card>
      {/* 注意：CardContent 基础类是 flex-col，这里必须显式 flex-row，否则左右两列会垂直堆叠居中 */}
      <CardContent className="flex flex-row flex-wrap items-center justify-between gap-x-8 gap-y-4 py-6">
        <div className="flex min-w-0 items-center gap-4">
          <AvatarFallback name={profile.realname || profile.username} />
          <div className="min-w-0">
            <p className="text-muted-foreground text-sm">{greeting()}，</p>
            <h1 className="truncate text-2xl font-bold tracking-tight">{profile.realname}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {profile.roleNames.map(name => (
                <span key={name} className="bg-primary/10 text-primary rounded-md px-1.5 py-0.5 text-xs font-medium">
                  {name}
                </span>
              ))}
              {profile.deptNames.map(name => (
                <span key={name} className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-xs">
                  {name}
                </span>
              ))}
              {profile.roleNames.length === 0 && (
                <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-600 dark:text-amber-400">
                  未分配角色
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2.5">
          <p className="text-sm font-medium whitespace-nowrap">{todayLabel()}</p>
          <p className="text-muted-foreground max-w-[26rem] text-right text-xs">
            上次登录：{loginMeta}
          </p>
          <div className="flex items-center gap-2">
            {canOpenNotices && noticeCount > 0 && (
              <Button variant="outline" size="sm" onClick={onOpenNotices}>
                <Bell />
                通知公告
                <span className="bg-primary/10 text-primary rounded px-1 text-xs">{noticeCount}</span>
              </Button>
            )}
            <Button variant="outline" size="sm" disabled={refreshing} onClick={onRefresh}>
              <RefreshCw className={cn(refreshing && 'animate-spin')} />
              刷新
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
