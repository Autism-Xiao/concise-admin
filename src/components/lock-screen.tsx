import { useState, type CSSProperties } from 'react'
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
 * 防快捷录入的防线（按浏览器分支）：
 * 1. Chromium/Safari：全程 `type="text"` + `-webkit-text-security: disc` CSS 打点 ——
 *    浏览器根本不把它当密码字段，凭据下拉/自动回填/记住气泡统统无从谈起
 *    （Chrome 聚焦 password 字段时仍会弹已存凭据下拉，任何 autoComplete 写法都挡不住，
 *     只有让它看不见 password 字段才行）；
 * 2. Firefox（不支持该 CSS）：text 起步、聚焦切 password，加载期回填错过，且不吞按键；
 * 3. `new-password` + 非常规字段名 + 三家管理器忽略标记，多层兜底；
 * 4. 不用 `<form>`：记住密码气泡由表单提交触发，无 form 则不会弹；
 * 5. 禁粘贴/复制/剪切/拖放/右键：只能手动敲键，旁人无法快捷录入或带出明文。
 */
export function LockScreen() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // 后端返回「账号已锁定」后本地禁用输入，避免用户在锁定期内继续徒劳尝试
  const [lockedOut, setLockedOut] = useState(false)
  // 聚焦状态：Firefox（不支持 text-security）回落「text 起步、聚焦切 password」方案用
  const [focused, setFocused] = useState(false)
  // Chromium/Safari 支持 -webkit-text-security：全程 type="text" 用 CSS 打点伪装密码，
  // 浏览器根本不把它当密码框 —— 凭据下拉/自动回填/记住密码气泡统统无从谈起。
  // （Chrome 在聚焦 password 字段时仍会弹已存凭据下拉，type 切换挡不住，只能让它
  //  压根看不见 password 字段。）Firefox 不支持该 CSS，回落 type 切换方案。
  const [maskedViaCss] = useState(() => typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('-webkit-text-security', 'disc'))

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
            // Chromium/Safari：全程 text + CSS 打点（见 maskedViaCss 注释），浏览器不认得密码框；
            // Firefox：text 起步、聚焦切 password，让加载期回填错过（聚焦下拉 Firefox 不弹）
            type={maskedViaCss || focused ? 'password' : 'text'}
            style={maskedViaCss ? ({ WebkitTextSecurity: 'disc' } as CSSProperties) : undefined}
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
            // 只允许手动敲键：粘贴/拖放/右键全禁，旁人无法从剪贴板快捷录入；
            // 复制/剪切也禁 —— text-security 打点下的文本选中复制会拿到明文
            onPaste={e => e.preventDefault()}
            onCopy={e => e.preventDefault()}
            onCut={e => e.preventDefault()}
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
