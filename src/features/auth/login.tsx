import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Eye, EyeOff, LayoutGrid, Loader2, Palette, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/assets/logo'
import { useLocale } from '@/context/locale-provider'
import { login } from '@/lib/auth'
import { reportLogin } from '@/features/system/log/api'
import { fetchAccounts } from './api'
import { CaptchaImage, randomCaptchaCode } from './components/captcha'

export function LoginPage() {
  const navigate = useNavigate()
  const { t } = useLocale()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [captchaInput, setCaptchaInput] = useState('')
  const [captchaCode, setCaptchaCode] = useState(randomCaptchaCode)
  const [submitting, setSubmitting] = useState(false)

  const refreshCaptcha = () => {
    setCaptchaCode(randomCaptchaCode())
    setCaptchaInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (captchaInput.trim().toLowerCase() !== captchaCode.toLowerCase()) {
      toast.error(t('login.captchaError'))
      refreshCaptcha()
      return
    }
    setSubmitting(true)
    try {
      const accounts = await fetchAccounts()
      const matched = accounts.find(a => a.username === account.trim() && a.password === password)
      if (!matched) {
        // 失败也记录登录日志（用输入的账号名）
        reportLogin(account.trim() || '未知', '失败').catch(() => {
          // 日志写入失败不影响登录流程
        })
        toast.error(t('login.credentialsError'))
        refreshCaptcha()
        return
      }
      if (matched.status === 'disabled') {
        reportLogin(matched.username, '失败').catch(() => {
          // 日志写入失败不影响登录流程
        })
        toast.error(t('login.accountDisabled'))
        refreshCaptcha()
        return
      }
      reportLogin(matched.username, '成功').catch(() => {
        // 日志写入失败不影响登录流程
      })
      login({ username: matched.username, name: matched.name, role: matched.role })
      toast.success(t('login.success'))
      void navigate({ to: '/dashboard' })
    } catch {
      toast.error(t('login.credentialsError'))
    } finally {
      setSubmitting(false)
    }
  }

  const features = [
    { icon: LayoutGrid, text: t('login.featureTabs') },
    { icon: Palette, text: t('login.featureTheme') },
    { icon: ShieldCheck, text: t('login.featureSafe') }
  ]

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* 品牌展示区（移动端隐藏），颜色跟随主题预设 / 自定义主题色 */}
      <div className="bg-primary text-primary-foreground relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1.5px, transparent 0)', backgroundSize: '26px 26px' }}
        />
        <div className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full bg-black/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="bg-background flex size-11 items-center justify-center rounded-xl shadow-sm">
            <Logo className="size-7" />
          </div>
          <span className="text-lg font-semibold">{import.meta.env.VITE_APP_NAME}</span>
        </div>

        <div className="relative space-y-8">
          <h1 className="max-w-md text-3xl leading-snug font-bold xl:text-4xl">{t('login.brandTagline')}</h1>
          <ul className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm opacity-90">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm opacity-70">{t('login.copyright')}</p>
      </div>

      {/* 登录表单区 */}
      <div className="bg-background relative flex items-center justify-center p-6">
        <div className="absolute top-6 left-6 flex items-center gap-2 lg:hidden">
          <Logo className="size-7" />
          <span className="font-semibold">{import.meta.env.VITE_APP_NAME}</span>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-2 w-full max-w-sm space-y-6 duration-500">
          <div className="space-y-1.5 text-center">
            <h2 className="text-2xl font-bold tracking-tight">{t('login.welcome')}</h2>
            <p className="text-muted-foreground text-sm">{t('login.desc')}</p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="account">{t('login.account')}</Label>
              <Input id="account" placeholder={t('login.accountPlaceholder')} value={account} onChange={e => setAccount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('login.password')}</Label>
                <Link to="/login" className="text-muted-foreground hover:text-foreground text-xs" onClick={e => e.preventDefault()}>
                  {t('login.forgot')}
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('login.passwordPlaceholder')}
                  className="pr-9"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <Button type="button" variant="ghost" size="icon" className="absolute top-0 right-0 h-9 w-9" onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  <span className="sr-only">显示/隐藏密码</span>
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="captcha">{t('login.captcha')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="captcha"
                  placeholder={t('login.captchaPlaceholder')}
                  className="flex-1"
                  value={captchaInput}
                  onChange={e => setCaptchaInput(e.target.value)}
                  maxLength={4}
                  required
                />
                <CaptchaImage code={captchaCode} onRefresh={refreshCaptcha} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitting ? t('login.submitting') : t('login.submit')}
            </Button>
            <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-center text-xs">{t('login.demoHint')}</p>
          </form>
        </div>
      </div>
    </div>
  )
}
