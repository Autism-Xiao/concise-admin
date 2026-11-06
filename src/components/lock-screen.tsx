import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, LockKeyhole } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLocale } from '@/context/locale-provider'
import { getName, getUsername, logout } from '@/lib/auth'
import { getApiResult } from '@/lib/http'
import { setLocked } from '@/lib/lock-screen'

/**
 * 锁屏遮罩：覆盖整个认证布局，输对当前账号密码才能回到工作区
 * 密码校验走 POST /v1/auth/verify-password（失败计入登录失败锁定，防暴力试密码）
 */
export function LockScreen() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!password || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await getApiResult('/backend-api/v1/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      setLocked(false)
    } catch (e) {
      // 后端会带「密码不正确 / 账号已锁定，请 X 后再试」等文案，直接展示
      setError(e instanceof Error ? e.message : t('lock.wrongPassword'))
      setPassword('')
    } finally {
      setSubmitting(false)
    }
  }

  const backToLogin = () => {
    logout()
    void navigate({ to: '/login' })
  }

  return (
    <div className="bg-background/80 fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md">
      <div className="bg-background flex w-full max-w-sm flex-col items-center gap-5 rounded-xl border p-8 shadow-lg">
        <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
          <LockKeyhole className="size-6" />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Avatar className="size-14">
            <AvatarFallback className="text-xl">{getName().slice(0, 1)}</AvatarFallback>
          </Avatar>
          <p className="text-base font-semibold">{getName()}</p>
          <p className="text-muted-foreground text-xs">@{getUsername()}</p>
        </div>
        <form
          className="w-full space-y-3"
          onSubmit={e => {
            e.preventDefault()
            void submit()
          }}
        >
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t('lock.passwordPlaceholder')}
            autoFocus
            disabled={submitting}
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
          <Button type="submit" className="w-full" disabled={!password || submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? t('lock.unlocking') : t('lock.unlock')}
          </Button>
        </form>
        <button type="button" onClick={backToLogin} className="text-muted-foreground hover:text-foreground text-xs transition-colors">
          {t('lock.backToLogin')}
        </button>
      </div>
    </div>
  )
}
