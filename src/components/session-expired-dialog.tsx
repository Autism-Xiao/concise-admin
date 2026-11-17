import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useLocale } from '@/context/locale-provider'
import { onSessionExpired, resetSessionExpiredFlag } from '@/lib/session-expired'

/**
 * 全局「登录已过期」弹框（挂在 __root，全站唯一实例）
 *
 * 触发源是 lib/http.ts 的 401 处理器（notifySessionExpired），内部已去重：
 * 登出后并发的一批请求只会触发一次。弹框不可 Esc/点遮罩关闭 —— 此时 token
 * 已清空，页面上的任何请求都会失败，「留在本页」没有意义；只有一个「重新登录」。
 */
export function SessionExpiredDialog() {
  const [open, setOpen] = useState(false)
  const { t } = useLocale()

  useEffect(() => onSessionExpired(() => setOpen(true)), [])

  const relogin = () => {
    setOpen(false)
    resetSessionExpiredFlag()
    // 整页跳转而非 SPA 路由：登出已清空本地凭证，刷新能顺带清掉
    // keep-alive 页签与内存里的组件状态，回到最干净的登录页
    window.location.assign('/login')
  }

  return (
    // 受控 Dialog 且忽略 onOpenChange：Esc / 点遮罩发来的关闭请求一律无效，
    // 此时 token 已清空，页面上的任何请求都会失败，「留在本页」没有意义
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('session.expired.title')}</DialogTitle>
          <DialogDescription>{t('session.expired.desc')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={relogin}>{t('session.expired.action')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
