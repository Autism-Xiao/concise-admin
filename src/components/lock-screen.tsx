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
 * 防快捷录入的四道防线：
 * 1. `type` 切换（text 起步、聚焦才变 password）：浏览器自动回填只认加载时的 password
 *    字段，回填窗口彻底错过，且不吞第一个按键（readOnly 方案会吞）；
 * 2. `new-password` + 非常规字段名 + 三家管理器忽略标记，多层兜底；
 * 3. 不用 `<form>`：记住密码气泡由表单提交触发，无 form 则不会弹；
 * 4. 禁粘贴/拖放/右键：只能手动敲键，旁人无法从剪贴板快捷录入。
 */
export function LockScreen() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // 后端返回「账号已锁定」后本地禁用输入，避免用户在锁定期内继续徒劳尝试
  const [lockedOut, setLockedOut] = useState(false)
  // readOnly 延迟解锁：浏览器密码管理器的自动回填发生在「页面加载、字段可编辑」时，
  // 挂载后保持 readOnly 让回填窗口直接错过；用户点击/Tab 聚焦后才解锁为可输入。
  // 失焦再锁回去，防止回填在之后任何时点重新出现。
  const [focused, setFocused] = useState(false)

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
        {/* 特意不用 <form>：浏览器「记住密码」气泡由表单提交事件触发，无 form 则不会弹 */}
        <div className="w-full space-y-3">
          <Input
            // 加载时是 text、聚焦后才切 password：密码管理器的自动回填只认「页面加载时的
            // password 字段」，text 起步 + 聚焦切换让回填窗口彻底错过，且不吞用户第一个按键
            type={focused ? 'password' : 'text'}
            // 不叫 password：避免浏览器按字段名回填已保存的密码
            name="lock-password"
            autoComplete="new-password"
            // 第三方管理器（1Password/LastPass/Dashlane）各认各的忽略标记，一并加上
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
            value={password}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            // 只允许手动敲键：粘贴/拖放/右键菜单全禁，旁人无法从剪贴板快捷录入
            onPaste={e => e.preventDefault()}
            onDrop={e => e.preventDefault()}
            onContextMenu={e => e.preventDefault()}
            onChange={e => {
              setPassword(e.target.value)
              if (error) setError(null)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void submit()
              }
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
          <Button type="button" className="w-full" onClick={() => void submit()} disabled={!password || submitting || lockedOut}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? t('lock.unlocking') : t('lock.unlock')}
          </Button>
        </div>
        <button type="button" onClick={backToLogin} className="text-muted-foreground hover:text-foreground text-xs transition-colors">
          {t('lock.backToLogin')}
        </button>
      </div>
    </div>
  )
}
