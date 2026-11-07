import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { KeyRound, Loader2, LockKeyhole, TriangleAlert } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLocale } from '@/context/locale-provider'
import { getName, getUsername, logout } from '@/lib/auth'
import { getApiResult } from '@/lib/http'
import { setLocked } from '@/lib/lock-screen'
import { readRememberPassword } from '@/lib/remember'

/**
 * 锁屏遮罩：覆盖整个认证布局，输对当前账号密码才能回到工作区
 *
 * 密码校验走 POST /v1/auth/verify-password（失败与登录共用失败计数：连错 5 次锁 24 小时）。
 * 两种情况会让用户少敲键盘：
 * 1. 登录时勾过「记住密码」→ 这里按当前账号读出来自动填充，点一下解锁即可；
 * 2. 浏览器密码管理器（autocomplete=current-password）也能直接填充。
 * 自动填充不等于自动解锁：仍然要用户点一次按钮，锁屏防「人离开座位」的意义才在。
 */
export function LockScreen() {
  const { t } = useLocale()
  const navigate = useNavigate()
  // 只认「属于当前登录账号」的记住密码，避免同机换人登录后把上一个人的密码填进来
  const rememberedPassword = useMemo(() => readRememberPassword(getUsername()), [])
  const [password, setPassword] = useState(rememberedPassword ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // 后端返回「账号已锁定」后本地禁用输入，避免用户在锁定期内继续徒劳尝试
  const [lockedOut, setLockedOut] = useState(false)
  // 用户手动改过密码框就不再显示「已自动填入」提示
  const [dirty, setDirty] = useState(false)

  const submit = async () => {
    if (!password || submitting || lockedOut) return
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
      // 后端会带「密码不正确，还可尝试 N 次 / 账号已锁定 24 小时」等文案，直接展示
      const message = e instanceof Error ? e.message : t('lock.wrongPassword')
      setError(message)
      setLockedOut(message.includes('已锁定'))
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
          autoComplete="on"
          onSubmit={e => {
            e.preventDefault()
            void submit()
          }}
        >
          {/* 隐藏用户名：浏览器密码管理器靠这一对字段判断「这是哪个站点的哪个账号」 */}
          <input type="text" name="username" value={getUsername()} readOnly hidden autoComplete="username" />
          <Input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={e => {
              setPassword(e.target.value)
              setDirty(true)
              if (error) setError(null)
            }}
            placeholder={t('lock.passwordPlaceholder')}
            autoFocus
            disabled={submitting || lockedOut}
          />
          {error && (
            <div className="border-destructive/40 bg-destructive/5 text-destructive flex items-start gap-2 rounded-md border px-3 py-2 text-xs">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}
          {!error && rememberedPassword && !dirty && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <KeyRound className="size-3.5" />
              {t('lock.rememberedHint')}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={!password || submitting || lockedOut}>
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
