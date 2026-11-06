import { Copy, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ResetPasswordResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 账号名，用于提示语 */
  username?: string
  /** 后端一次性下发的明文密码，关闭后不再显示 */
  password?: string
}

/**
 * 重置密码结果对话框：明文只在本次展示（后端不落库、不进日志）。
 * 关闭即视为「已妥善转交」，之后无法再查看，只能再次重置。
 */
export function ResetPasswordResultDialog({ open, onOpenChange, username, password }: ResetPasswordResultDialogProps) {
  const copy = async () => {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
      toast.success('新密码已复制到剪贴板')
    } catch {
      toast.error('复制失败，请手动选择复制')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            密码已重置
          </DialogTitle>
          <DialogDescription>
            {username ? `账号 ${username} 的新密码如下。` : '新密码如下。'}该密码仅显示这一次，关闭后无法再查看（只能再次重置），请立即转交给用户。
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted flex items-center justify-between gap-3 rounded-md px-4 py-3">
          <code className="text-lg font-semibold tracking-wider select-all">{password}</code>
          <Button type="button" variant="outline" size="sm" onClick={copy}>
            <Copy className="size-3.5" />
            复制
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">该用户的所有在线会话已被强制下线，需要用新密码重新登录。</p>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            我已保存，关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
