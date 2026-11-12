import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchLoginLogs, type LoginLog } from '@/features/system/log/api'

interface UserLoginLogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 目标用户（用于标题与按人过滤） */
  user: { id: string; username: string; realname?: string }
}

/** 登录日志表格（复用日志页的行渲染风格：时间/IP/浏览器/系统/结果） */
function LogRows({ logs, loading, error }: { logs: LoginLog[] | null; loading: boolean; error: string | null }) {
  if (loading) {
    return (
      <div className="space-y-2 py-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-2/3" />
      </div>
    )
  }
  if (error) return <p className="text-destructive py-4 text-sm">{error}</p>
  if (!logs?.length) return <p className="text-muted-foreground py-4 text-sm">该用户暂无登录记录</p>
  return (
    <div className="max-h-80 overflow-y-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 sticky top-0">
          <tr className="text-start">
            <th className="w-14 px-3 py-2 text-center font-medium">序号</th>
            <th className="px-3 py-2 text-start font-medium">时间</th>
            <th className="px-3 py-2 text-start font-medium">IP</th>
            <th className="hidden px-3 py-2 text-start font-medium sm:table-cell">浏览器</th>
            <th className="hidden px-3 py-2 text-start font-medium md:table-cell">操作系统</th>
            <th className="px-3 py-2 text-start font-medium">结果</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index) => (
            <tr key={log.id} className="border-t">
              <td className="text-muted-foreground px-3 py-2 text-center tabular-nums">{index + 1}</td>
              <td className="px-3 py-2 whitespace-nowrap">{log.time}</td>
              <td className="px-3 py-2 font-mono text-xs">{log.ip}</td>
              <td className="hidden px-3 py-2 sm:table-cell">{log.browser}</td>
              <td className="hidden px-3 py-2 md:table-cell">{log.os}</td>
              <td className="px-3 py-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    log.status === '成功' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                  }`}
                  title={log.message}
                >
                  {log.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** 用户维度的登录日志弹窗：从用户管理操作栏进入，按 userId 精确过滤 */
export function UserLoginLogDialog({ open, onOpenChange, user }: UserLoginLogDialogProps) {
  const [logs, setLogs] = useState<LoginLog[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    fetchLoginLogs(user.id)
      .then(setLogs)
      .catch(e => setError(e instanceof Error ? e.message : '加载登录日志失败'))
      .finally(() => setLoading(false))
  }, [open, user.id])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>登录日志 — {user.realname || user.username}</DialogTitle>
          <DialogDescription>最近 100 条登录记录（成功与失败都计入；失败原因悬停在状态上可见）</DialogDescription>
        </DialogHeader>
        <LogRows logs={logs} loading={loading} error={error} />
      </DialogContent>
    </Dialog>
  )
}
