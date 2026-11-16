import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordResetCode, resetPasswordByCode } from './api'

/**
 * 忘记密码（邮件验证码）
 *
 * 两步：① 输入账号或邮箱申请验证码 → ② 填 6 位码 + 新密码。
 *
 * 两个刻意的产品决定：
 * - 第一步提交后**不管账号存不存在都进第二步**：后端本来就不区分（防枚举），
 *   前端要是"账号不存在"就报错，等于把后端的防护又漏回去了。
 * - 验证码有效期来自后端返回的 ttlMinutes，不在前端写死。
 */
export function ForgotPasswordDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 从登录表单带过来的账号，省得用户再打一遍 */
  defaultAccount?: string
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [account, setAccount] = useState(props.defaultAccount ?? '')
  const [ttlMinutes, setTtlMinutes] = useState(5)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 每次打开都回到第一步，避免上次的半截输入残留
  useEffect(() => {
    if (!props.open) return
    setStep(1)
    setAccount(props.defaultAccount ?? '')
    setCode('')
    setPassword('')
    setConfirm('')
    setError(null)
  }, [props.open, props.defaultAccount])

  const sendCode = async () => {
    const target = account.trim()
    if (!target) {
      setError('请输入账号或邮箱')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await requestPasswordResetCode(target)
      setTtlMinutes(res.ttlMinutes ?? 5)
      setStep(2)
      toast.success('验证码已发送，请查收账号绑定的邮箱')
    } catch (err) {
      setError(err instanceof Error ? err.message : '申请失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('请输入 6 位数字验证码')
      return
    }
    if (password.length < 8) {
      setError('新密码至少 8 位')
      return
    }
    if (password !== confirm) {
      setError('两次输入的新密码不一致')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await resetPasswordByCode({ account: account.trim(), code, newPassword: password })
      toast.success('密码已重置，请用新密码登录')
      props.onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-4" />
            忘记密码
          </DialogTitle>
          <DialogDescription>
            {step === 1 ? '输入账号或账号绑定的邮箱，我们会发一封验证码邮件。' : `验证码已发送，${ttlMinutes} 分钟内有效，只能使用一次。`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-2">
            <Label htmlFor="forgot-account">账号或邮箱</Label>
            <Input
              id="forgot-account"
              value={account}
              placeholder="登录账号或绑定邮箱"
              onChange={e => setAccount(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void sendCode()
              }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-code">验证码</Label>
              <Input
                id="forgot-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="邮件里的 6 位数字"
                className="tracking-[0.4em]"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forgot-password">新密码</Label>
              <Input
                id="forgot-password"
                type="password"
                autoComplete="new-password"
                placeholder="至少 8 位，需含大小写/数字/符号中的三类"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forgot-confirm">确认新密码</Label>
              <Input
                id="forgot-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs underline-offset-4 hover:underline"
              onClick={() => setStep(1)}
            >
              <ArrowLeft className="size-3" />
              换个账号 / 重新发送
            </button>
          </div>
        )}

        {error && <p className="text-destructive text-xs leading-relaxed">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)} disabled={busy}>
            取消
          </Button>
          {step === 1 ? (
            <Button onClick={() => void sendCode()} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              发送验证码
            </Button>
          ) : (
            <Button onClick={() => void submit()} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              重置密码
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
