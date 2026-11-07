import type { ReactNode } from 'react'
import { HardDrive, LogIn, ShieldCheck, UserCheck, Users, type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatBytes, type DashboardOverview } from '../api'

interface MetricItem {
  key: string
  title: string
  icon: LucideIcon
  value: string
  hint: string
  hintTone?: 'default' | 'danger'
  footer?: ReactNode
}

/** 小进度条：存储占用用（超过 85% 变红，提醒清理回收站） */
function ProgressBar({ percent, danger }: { percent: number; danger: boolean }) {
  return (
    <div className="bg-muted mt-1.5 h-1.5 w-full overflow-hidden rounded-full">
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', danger ? 'bg-destructive' : 'bg-primary')}
        style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
      />
    </div>
  )
}

/**
 * 指标卡
 *
 * 只渲染后端真正返回了的块（null = 无权限 = 不画）。
 * 这里刻意不做 `?? 0` 兜底：0 和「没权限」是两个完全不同的意思，混起来会误导。
 */
export function MetricCards({ data }: { data: DashboardOverview }) {
  const items: MetricItem[] = []

  if (data.userTotal) {
    items.push({
      key: 'userTotal',
      title: '用户总数',
      icon: Users,
      value: data.userTotal.total.toLocaleString(),
      hint: `启用 ${data.userTotal.active} · 冻结 ${data.userTotal.frozen}`,
      hintTone: data.userTotal.frozen > 0 ? 'danger' : 'default'
    })
  }

  if (data.todayLogin) {
    items.push({
      key: 'todayLogin',
      title: data.todayLogin.scope === 'all' ? '今日登录' : '今日登录（我的）',
      icon: LogIn,
      value: data.todayLogin.success.toLocaleString(),
      hint: data.todayLogin.fail > 0 ? `失败 ${data.todayLogin.fail} 次` : '没有失败登录',
      hintTone: data.todayLogin.fail > 0 ? 'danger' : 'default'
    })
  }

  if (data.onlineCount !== null) {
    items.push({
      key: 'onlineCount',
      title: '在线人数',
      icon: UserCheck,
      value: data.onlineCount.toLocaleString(),
      hint: '实时会话（Redis）'
    })
  }

  if (data.roleTotal !== null) {
    items.push({
      key: 'roleTotal',
      title: '角色总数',
      icon: ShieldCheck,
      value: data.roleTotal.toLocaleString(),
      hint: '按角色分配菜单与按钮'
    })
  }

  // 存储永远可见（只看自己的），所以没有 null 判断
  const storage = data.myStorage
  const usedPercent = storage.quotaBytes > 0 ? (storage.usedBytes / storage.quotaBytes) * 100 : 0
  items.push({
    key: 'storage',
    title: '我的存储',
    icon: HardDrive,
    value: formatBytes(storage.usedBytes),
    hint: `${storage.fileCount} 个文件 · 配额 ${formatBytes(storage.quotaBytes)}`,
    footer: <ProgressBar percent={usedPercent} danger={usedPercent >= 85} />
  })

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))' }}>
      {items.map(item => (
        <Card key={item.key}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-muted-foreground text-sm font-medium">{item.title}</CardTitle>
              <item.icon className="text-muted-foreground/60 size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight tabular-nums">{item.value}</div>
            <p
              className={cn(
                'mt-1 text-xs',
                item.hintTone === 'danger' ? 'text-destructive font-medium' : 'text-muted-foreground'
              )}
            >
              {item.hint}
            </p>
            {item.footer}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
