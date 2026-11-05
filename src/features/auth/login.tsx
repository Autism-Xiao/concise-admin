import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AppWindow, Eye, EyeOff, Loader2, Lock, Palette, ScanLine, ShieldCheck, User } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/assets/logo'
import { LanguageToggle } from '@/components/language-toggle'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/context/locale-provider'
import { login, setMenuTree, setPermissions, setTokens } from '@/lib/auth'
import { resolveHomePath } from '@/lib/home-path'
import { computePermittedPaths, notifyPermissionsChanged } from '@/lib/permissions'
import { fetchCaptcha, fetchPermissions, loginRequest, type CaptchaData } from './api'
import { CaptchaBox } from './components/captcha'

const APP_NAME = import.meta.env.VITE_APP_NAME

/** 演示账号快捷填充 */
const DEMO_ACCOUNTS = [
  { username: 'admin', password: 'admin123' },
  { username: 'guest', password: 'guest123' }
]

export function LoginPage() {
  const navigate = useNavigate()
  const { t } = useLocale()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [captchaInput, setCaptchaInput] = useState('')
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null)
  const [captchaLoading, setCaptchaLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // 字段级非空校验（Element Plus 风格：错误红字内联显示，输入即清除）
  const [errors, setErrors] = useState<{ account?: string; password?: string; captcha?: string }>({})

  const validateField = (field: 'account' | 'password' | 'captcha', value: string) => {
    const msg = value.trim() ? undefined : t(`login.${field}Required`)
    setErrors(prev => ({ ...prev, [field]: msg }))
    return !msg
  }

  const validateForm = () => {
    const next = {
      account: account.trim() ? undefined : t('login.accountRequired'),
      password: password.trim() ? undefined : t('login.passwordRequired'),
      captcha: captchaInput.trim() ? undefined : t('login.captchaRequired')
    }
    setErrors(next)
    return !next.account && !next.password && !next.captcha
  }

  // 加载/刷新后端验证码（进入页面时自动加载一次）
  const refreshCaptcha = useCallback(async () => {
    setCaptchaLoading(true)
    setCaptchaInput('')
    try {
      setCaptcha(await fetchCaptcha())
    } catch {
      setCaptcha(null)
      toast.error(t('login.captchaLoadError'))
    } finally {
      setCaptchaLoading(false)
    }
  }, [t])

  useEffect(() => {
    void refreshCaptcha()
  }, [refreshCaptcha])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    if (!captcha) {
      toast.error(t('login.captchaLoadError'))
      void refreshCaptcha()
      return
    }
    setSubmitting(true)
    try {
      const data = await loginRequest({
        username: account.trim(),
        password,
        captchaId: captcha.captchaId,
        captchaCode: captchaInput.trim()
      })
      // 宽松兼容后端返回的 token / 用户字段
      const user = data.userInfo ?? data.user ?? {}
      const username = user.username ?? account.trim()
      setTokens(data.accessToken ?? data.token, data.refreshToken)
      // 后端 roles 是对象数组（[{ roleCode }]），取第一个角色的 code
      const firstRole = Array.isArray(user.roles) ? user.roles[0] : undefined
      const roleCode = typeof firstRole === 'string' ? firstRole : (firstRole?.roleCode ?? user.role ?? 'viewer')
      login({ username, name: user.nickname ?? user.realname ?? user.name ?? username, role: roleCode })
      // 登录后拉一次权限汇总（角色/按钮权限/菜单树），失败不阻塞进入系统（无菜单权限，进 403）
      try {
        const perm = await fetchPermissions()
        setPermissions(perm.permissions ?? [])
        setMenuTree(perm.menus ?? [])
      } catch {
        // 权限接口异常时不写入菜单，permissions.ts 按「无可见菜单」处理
      }
      notifyPermissionsChanged()
      toast.success(t('login.success'))
      // 落地页跟随权限：只授权了业务菜单的账号没有 /dashboard，硬跳会被权限守卫拦到 403
      const home = resolveHomePath(computePermittedPaths())
      void navigate({ to: (home ?? '/dashboard') as never })
    } catch (err) {
      // 后端 message 直接透出（如：验证码错误 / 用户名或密码错误）
      toast.error(err instanceof Error ? err.message : t('login.credentialsError'))
      void refreshCaptcha()
    } finally {
      setSubmitting(false)
    }
  }

  const features = [
    { icon: AppWindow, text: t('login.featureTabs') },
    { icon: Palette, text: t('login.featureTheme') },
    { icon: ShieldCheck, text: t('login.featureSafe') }
  ]

  return (
    <div className="bg-background flex min-h-screen">
      {/* 左侧品牌面板：反色设计（跟随 primary 变量，深浅色自动反转） */}
      <div className="bg-primary text-primary-foreground relative hidden w-[46%] flex-col justify-between overflow-hidden p-12 lg:flex xl:w-1/2">
        {/* 网格纹理 */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
            backgroundSize: '44px 44px'
          }}
        />
        {/* 漂浮光斑 */}
        <div className="bg-primary-foreground/10 animate-login-float pointer-events-none absolute -top-24 -left-24 size-80 rounded-full blur-3xl" />
        <div
          className="bg-primary-foreground/5 animate-login-float pointer-events-none absolute -right-16 bottom-16 size-96 rounded-full blur-3xl"
          style={{ animationDelay: '-4s' }}
        />

        <div className="relative flex items-center gap-3 transition-all duration-700 starting:-translate-y-3 starting:opacity-0">
          <Logo variant="inverted" className="size-10" />
          <span className="text-lg font-semibold tracking-wide">{APP_NAME}</span>
        </div>

        <div className="relative max-w-md space-y-8 transition-all delay-100 duration-700 starting:translate-y-4 starting:opacity-0">
          <h1 className="text-4xl leading-snug font-bold">{t('login.brandTagline')}</h1>
          <ul className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="bg-primary-foreground/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-4" />
                </span>
                <span className="text-primary-foreground/80 text-sm">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-primary-foreground/50 relative text-xs">{t('login.copyright')}</p>
      </div>

      {/* 右侧登录表单 */}
      <div className="relative flex flex-1 items-center justify-center p-6">
        <div className="absolute top-4 right-4 flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm space-y-8 transition-all duration-700 starting:translate-y-4 starting:opacity-0">
          <div className="space-y-2 text-center">
            <Logo className="mx-auto size-12 lg:hidden" />
            <h2 className="text-2xl font-semibold tracking-tight">{t('login.welcome')}</h2>
            <p className="text-muted-foreground text-sm">
              {t('login.desc')} {APP_NAME}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="account">{t('login.account')}</Label>
              <div className="relative">
                <User className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  id="account"
                  className="pl-9"
                  placeholder={t('login.accountPlaceholder')}
                  value={account}
                  onChange={e => {
                    setAccount(e.target.value)
                    if (errors.account) validateField('account', e.target.value)
                  }}
                  onBlur={e => validateField('account', e.target.value)}
                  aria-invalid={!!errors.account}
                />
              </div>
              {errors.account && <p className="text-destructive text-xs">{errors.account}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('login.password')}</Label>
                <Link to="/login" className="text-muted-foreground hover:text-foreground text-xs" onClick={e => e.preventDefault()}>
                  {t('login.forgot')}
                </Link>
              </div>
              <div className="relative">
                <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('login.passwordPlaceholder')}
                  className="pr-9 pl-9"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value)
                    if (errors.password) validateField('password', e.target.value)
                  }}
                  onBlur={e => validateField('password', e.target.value)}
                  aria-invalid={!!errors.password}
                />
                <Button type="button" variant="ghost" size="icon" className="absolute top-0 right-0 h-9 w-9" onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  <span className="sr-only">显示/隐藏密码</span>
                </Button>
              </div>
              {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="captcha">{t('login.captcha')}</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <ScanLine className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="captcha"
                    placeholder={t('login.captchaPlaceholder')}
                    className="pl-9"
                    value={captchaInput}
                    onChange={e => {
                      setCaptchaInput(e.target.value)
                      if (errors.captcha) validateField('captcha', e.target.value)
                    }}
                    onBlur={e => validateField('captcha', e.target.value)}
                    aria-invalid={!!errors.captcha}
                    maxLength={4}
                  />
                </div>
                <CaptchaBox captcha={captcha} loading={captchaLoading} onRefresh={() => void refreshCaptcha()} refreshTitle={t('login.captchaRefresh')} />
              </div>
              {errors.captcha && <p className="text-destructive text-xs">{errors.captcha}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitting ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>

          <div className="space-y-3">
            <p className="text-muted-foreground text-center text-xs">{t('login.demoHint')}</p>
            <div className="flex justify-center gap-2">
              {DEMO_ACCOUNTS.map(demo => (
                <button
                  key={demo.username}
                  type="button"
                  onClick={() => {
                    setAccount(demo.username)
                    setPassword(demo.password)
                  }}
                  className="text-muted-foreground hover:text-foreground hover:border-foreground/30 cursor-pointer rounded-full border px-3 py-1 font-mono text-xs transition-colors"
                >
                  {demo.username}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
