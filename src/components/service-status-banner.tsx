import { useEffect, useState } from 'react'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { API_RECOVERED_EVENT, API_UNAVAILABLE_EVENT, isServiceUnavailable } from '@/lib/api-error'

/**
 * 全局「服务连不上」横幅
 *
 * 为什么需要它：后端没启动时，页面上每个接口都会失败，光靠 toast 会连弹七八条
 * 一模一样的红字，还一闪就没了，用户既看不清也记不住。这里合并成一条常驻横幅，
 * 说清「现在用不了 + 该怎么办」，并给一个明确的「重新连接」按钮。
 *
 * 触发方式：http 层遇到网络/超时/网关错误时广播 API_UNAVAILABLE_EVENT；
 * 任意请求成功（API_RECOVERED_EVENT）自动收起，不用用户手动关。
 */
export function ServiceStatusBanner() {
  // 初始值读模块状态：登录阶段就已经失败的场景，进到布局时横幅要立刻可见
  const [down, setDown] = useState(isServiceUnavailable)

  useEffect(() => {
    const onDown = () => setDown(true)
    const onUp = () => setDown(false)
    window.addEventListener(API_UNAVAILABLE_EVENT, onDown)
    window.addEventListener(API_RECOVERED_EVENT, onUp)
    return () => {
      window.removeEventListener(API_UNAVAILABLE_EVENT, onDown)
      window.removeEventListener(API_RECOVERED_EVENT, onUp)
    }
  }, [])

  if (!down) return null

  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-800 dark:text-amber-300"
    >
      <TriangleAlert className="size-4 shrink-0" />
      <span className="flex-1">
        服务连接失败，页面上的数据可能不完整。请稍后重试；如果一直失败，请联系管理员检查服务是否正常。
      </span>
      <Button variant="outline" size="sm" className="h-7 shrink-0 gap-1.5" onClick={() => window.location.reload()}>
        <RefreshCw className="size-3.5" />
        重新连接
      </Button>
    </div>
  )
}
