import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { setUserVip, type User } from '../api'

interface UserVipDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
  onSaved: () => void
}

/**
 * VIP 设置（平台级操作）
 *
 * VIP = 能否「自助开通租户」的资格；取消不会回收已开通的团队。
 * 到期日留空 = 永久；过期后只影响新开通，用户仍可正常登录使用系统。
 */
export function UserVipDialog({ open, onOpenChange, user, onSaved }: UserVipDialogProps) {
  const [enabled, setEnabled] = useState(Number(user.vipLevel) === 1)
  const [expireAt, setExpireAt] = useState(() => (user.vipExpireAt ? user.vipExpireAt.slice(0, 10) : ''))
  const [submitting, setSubmitting] = useState(false)

  // 每次打开重置为当前用户的真实状态（父组件按 key 重挂也可以，这里双保险）
  useEffect(() => {
    if (!open) return
    setEnabled(Number(user.vipLevel) === 1)
    setExpireAt(user.vipExpireAt ? user.vipExpireAt.slice(0, 10) : '')
  }, [open, user])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await setUserVip(user.id, enabled ? 1 : 0, enabled ? expireAt : '')
      toast.success(enabled ? `已为「${user.realname || user.username}」开通 VIP` : `已取消「${user.realname || user.username}」的 VIP`)
      onOpenChange(false)
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>VIP 设置</DialogTitle>
          <DialogDescription>
            账号：{user.realname || user.username}（{user.username}）
          </DialogDescription>
        </DialogHeader>
        <form id="user-vip-form" className="space-y-4" onSubmit={submit}>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              className="accent-primary mt-0.5 size-4"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium">开通 VIP</span>
              <span className="text-muted-foreground block text-xs">VIP 可自助开通团队（租户），普通账号仍可正常登录使用系统</span>
            </span>
          </label>
          {enabled && (
            <div className="space-y-2">
              <Label htmlFor="vip-expire">VIP 到期日</Label>
              <Input id="vip-expire" type="date" value={expireAt} onChange={e => setExpireAt(e.target.value)} />
              <p className="text-muted-foreground text-xs">留空表示永久有效；到期后只影响新开通，不影响已开的团队</p>
            </div>
          )}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button type="submit" form="user-vip-form" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
