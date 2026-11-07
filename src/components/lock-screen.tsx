import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, LockKeyhole, TriangleAlert } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLocale } from '@/context/locale-provider'
import { getName, getUsername, logout } from '@/lib/auth'
import { getApiResult } from '@/lib/http'
import { setLocked } from '@/lib/lock-screen'

/**
 * 锁屏遮罩：覆盖整个认证布局，输对当前账号密码才能回到工作区
 *
 * 密码校验走 POST /v1/auth/verify-password（失败与登录共用失败计数：连错 5 次锁 24 小时）。
 *
 * **锁屏页不记住密码**：登录页勾过的「记住密码」只服务于下次登录，不能带进锁屏 ——
 * 锁屏的意义就是「人离开座位时挡住旁人」，密码预填好、点一下就能进，等于没锁。
 * 因此这里既不读本地保存的密码，也不让浏览器密码管理器回填（`new-password`
 * 是唯一能可靠阻止 Chrome 自动填充的写法，`off` 对密码框会被忽略）。
 */
export function LockScreen() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // 后端返回「账号已锁定」后本地禁用输入，避免用户在锁定期内继续徒劳尝试
  const [lockedOut, setLockedOut] = useState(false)

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
          autoComplete="off"
          onSubmit={e => {
            e.preventDefault()
            void submit()
          }}
        >
          <Input
            type="password"
            // 不叫 password：配合 new-password 可避免浏览器按字段名回填已保存的密码
            name="lock-password"
            autoComplete="new-password"
            value={password}
            onChange={e => {
              setPassword(e.target.value)
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
