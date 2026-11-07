import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AppWindow, ChevronRight, CircleCheckBig, Eye, EyeOff, Loader2, Lock, Palette, ShieldCheck, User } from 'lucide-react'
import { toast } from 'sonner'
import SliderCaptcha, { type ActionType, type VerifyParam } from 'rc-slider-captcha'
import { cn } from 'cn'
import { Logo } from '@/assets/logo'
import { LanguageToggle } from '@/components/language-toggle'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLocale } from '@/context/locale-provider'
import { login, setMenuTree, setMustChangePassword, setPermissions, setTokens } from '@/lib/auth'
import { resolveHomePath } from '@/lib/home-path'
import { notifyPermissionsChanged } from '@/lib/permissions'
import { fetchCaptcha, fetchPermissions, loginRequest, verifyCaptcha } from './api'

const APP_NAME = import.meta.env.VITE_APP_NAME

/** 「记住密码」可选有效期（天） */
const REMEMBER_OPTIONS = [1, 7, 15] as const
type RememberDays = (typeof REMEMBER_OPTIONS)[number]
const REMEMBER_DAYS_DEFAULT: RememberDays = 7
const REMEMBER_KEY = 'concise-remember'

/**
 * 记住密码存本地：password 只做 base64 编码（避免明文肉眼可见），
 * 不是加密 —— 浏览器本地存储本身可被同源脚本读取，公共设备建议不要勾选。
 */
interface RememberedLogin {
  username: string
  secret: string
  days: RememberDays
  expireAt: number
}

function readRemember(): RememberedLogin | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as RememberedLogin
    if (!data.expireAt || data.expireAt < Date.now()) {
      localStorage.removeItem(REMEMBER_KEY)
      return null
    }
    return data
  } catch {
    localStorage.removeItem(REMEMBER_KEY)
    return null
  }
}

function decodeSecret(secret: string): string {
  try {
    return decodeURIComponent(atob(secret))
  } catch {
    return ''
  }
}

function writeRemember(username: string, password: string, days: RememberDays) {
  const data: RememberedLogin = {
    username,
    secret: btoa(encodeURIComponent(password)),
    days,
    expireAt: Date.now() + days * 24 * 60 * 60 * 1000
  }
  localStorage.setItem(REMEMBER_KEY, JSON.stringify(data))
}

function clearRemember() {
  localStorage.removeItem(REMEMBER_KEY)
}

export function LoginPage() {
  const navigate = useNavigate()
  const { t } = useLocale()
  // 已过期/损坏的记住记录在读取时就被清掉，这里只在首帧读一次
  const [remembered] = useState(readRemember)
  const [account, setAccount] = useState(remembered?.username ?? '')
  const [password, setPassword] = useState(() => (remembered ? decodeSecret(remembered.secret) : ''))
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // 记住密码：勾选后按所选天数保存，登录成功才落盘，取消勾选立即清除
  const [remember, setRemember] = useState(!!remembered)
  const [rememberDays, setRememberDays] = useState<RememberDays>(remembered?.days ?? REMEMBER_DAYS_DEFAULT)
  // 字段级非空校验（Element Plus 风格：错误红字内联显示，输入即清除）
  const [errors, setErrors] = useState<{ account?: string; password?: string }>({})

  // 滑块验证码：captchaId / ticket 放 ref（request/onVerify 回调闭包要拿最新值），ticket 另存 state 供提交判断
  const sliderRef = useRef<ActionType | undefined>(undefined)
  const captchaIdRef = useRef('')
  const ticketRef = useRef('')
  const [captchaTicket, setCaptchaTicket] = useState('')
  // 验证码收进弹框：表单里只占一行触发条，点开才加载图片（每次打开都是新题，图自然变化）
  const [captchaOpen, setCaptchaOpen] = useState(false)
  const closeTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const validateField = (field: 'account' | 'password', value: string) => {
    const msg = value.trim() ? undefined : t(`login.${field}Required`)
    setErrors(prev => ({ ...prev, [field]: msg }))
    return !msg
  }

  const validateForm = () => {
    const next = {
      account: account.trim() ? undefined : t('login.accountRequired'),
      password: password.trim() ? undefined : t('login.passwordRequired')
    }
    setErrors(next)
    return !next.account && !next.password
  }

  // 拉取滑块挑战（组件挂载/刷新时自动调用）；加载失败由组件展示「加载失败」状态
  const requestCaptcha = useCallback(async () => {
    const data = await fetchCaptcha()
    captchaIdRef.current = data.captchaId
    return { bgUrl: data.bgUrl, puzzleUrl: data.puzzleUrl }
  }, [])

  // 拖拽结束：把位移 x 交给后端校验，通过则拿到一次性 ticket；reject（抛错）= 验证失败，组件自动刷新换新图
  const handleCaptchaVerify = useCallback(async (data: VerifyParam) => {
    const { ticket } = await verifyCaptcha(captchaIdRef.current, Math.round(data.x))
    ticketRef.current = ticket
    setCaptchaTicket(ticket)
    // 先让用户看一眼「验证成功」绿态，再自动收起弹框
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setCaptchaOpen(false), 600)
  }, [])

  // 登录失败后重置：一次性 ticket 已失效，清空并让弹框下次打开时重新出题
  const resetCaptcha = useCallback(() => {
    ticketRef.current = ''
    setCaptchaTicket('')
    sliderRef.current?.refresh()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    if (!captchaTicket) {
      toast.error(t('login.captchaRequired'))
      return
    }
    setSubmitting(true)
    try {
      const data = await loginRequest({
        username: account.trim(),
        password,
        captchaTicket: ticketRef.current
      })
      // 宽松兼容后端返回的 token / 用户字段
      const user = data.userInfo ?? data.user ?? {}
      const username = user.username ?? account.trim()
      setTokens(data.accessToken ?? data.token, data.refreshToken)
      // 登录成功才落盘记住密码（失败不保存，避免存下错密码反复撞库）
      if (remember) writeRemember(account.trim(), password, rememberDays)
      else clearRemember()
      // 后端 roles 是对象数组（[{ roleCode }]），取第一个角色的 code
      const firstRole = Array.isArray(user.roles) ? user.roles[0] : undefined
      const roleCode = typeof firstRole === 'string' ? firstRole : (firstRole?.roleCode ?? user.role ?? 'viewer')
      login({ username, name: user.nickname ?? user.realname ?? user.name ?? username, role: roleCode })
      // 密码过期 / 管理员标记强制改密：进系统前由布局层弹不可关闭的改密框
      setMustChangePassword(!!data.mustChangePassword)
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
      // 首页是常驻页面（数据按权限裁剪），任何账号都落到 /dashboard
      void navigate({ to: resolveHomePath() as never })
    } catch (err) {
      // 后端 message 直接透出（如：验证码错误 / 用户名或密码错误）；票据一次性，失败后重置滑块
      toast.error(err instanceof Error ? err.message : t('login.credentialsError'))
      resetCaptcha()
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
              <Label htmlFor="password">{t('login.password')}</Label>
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
              {/* 记住密码：勾选后按所选天数保存账号密码，到期自动失效 */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <label className="text-muted-foreground flex cursor-pointer items-center gap-1.5 text-xs select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => {
                      const next = e.target.checked
                      setRemember(next)
                      // 取消勾选立即清除本地凭证，不留残余
                      if (!next) clearRemember()
                    }}
                    className="accent-primary size-3.5 cursor-pointer"
                  />
                  {t('login.remember')}
                </label>
                <div className={cn('transition-opacity', remember ? '' : 'opacity-40')}>
                  <Select<RememberDays>
                    value={rememberDays}
                    onValueChange={days => setRememberDays(days)}
                    disabled={!remember}
                    items={REMEMBER_OPTIONS.map(days => ({ value: days, label: `${days}${t('login.dayUnit')}` }))}
                  >
                    <SelectTrigger
                      size="sm"
                      aria-label={t('login.remember')}
                      className="text-foreground hover:bg-muted/60 h-7 min-w-[76px] rounded-full px-2.5 text-xs shadow-none transition-colors"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end" className="border-border min-w-[96px] border shadow-lg">
                      {REMEMBER_OPTIONS.map(days => (
                        <SelectItem key={days} value={days} className="text-xs">
                          {days}
                          {t('login.dayUnit')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('login.captcha')}</Label>
              {/* 触发条与输入框同高（h-9）同宽，把 320x160 的拼图收进弹框，表单不再被撑高 */}
              <button
                type="button"
                onClick={() => {
                  // 取消可能还在等待的「成功后自动关闭」，避免关闭刚打开的新弹框
                  window.clearTimeout(closeTimer.current)
                  setCaptchaOpen(true)
                }}
                className={cn(
                  'flex h-9 w-full cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition-colors',
                  captchaTicket
                    ? 'border-emerald-500/45 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400'
                    : 'border-input text-muted-foreground hover:border-foreground/25 hover:bg-muted/50',
                  'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none'
                )}
              >
                {captchaTicket ? <CircleCheckBig className="size-4 shrink-0" /> : <ShieldCheck className="size-4 shrink-0" />}
                <span className="truncate">{captchaTicket ? t('login.captchaVerified') : t('login.captchaTrigger')}</span>
                <span className={cn('ml-auto flex shrink-0 items-center gap-0.5 text-xs', captchaTicket ? 'opacity-80' : 'opacity-60')}>
                  {captchaTicket ? t('login.captchaRetry') : null}
                  <ChevronRight className="size-3.5" />
                </span>
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitting ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>
        </div>
      </div>
      {/* 验证码弹框：宽度跟随 320px 固定出图（缩放会让 x 轴校验错位），收起时不占布局空间；
          弹框关闭即卸载组件，下次打开重新 request，题目与拼图位置都会变 */}
      <Dialog open={captchaOpen} onOpenChange={setCaptchaOpen}>
        <DialogContent className="w-auto max-w-[calc(100vw-1.5rem)] gap-4 p-3 sm:max-w-[360px] sm:p-5">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-base font-medium">{t('login.captchaDialogTitle')}</DialogTitle>
            <DialogDescription className="text-xs">{t('login.captchaDialogDesc')}</DialogDescription>
          </DialogHeader>
          <SliderCaptcha
            actionRef={sliderRef}
            request={requestCaptcha}
            onVerify={handleCaptchaVerify}
            className="captcha-slider"
            style={{
              width: 320,
              '--rcsc-primary': 'var(--primary)',
              '--rcsc-primary-light': 'color-mix(in oklab, var(--primary) 16%, var(--background))',
              '--rcsc-error': 'var(--destructive)',
              '--rcsc-error-light': 'color-mix(in oklab, var(--destructive) 12%, var(--background))',
              // 成功/失败是语义色，不跟随品牌色：否则切到红/蓝主题时「通过」会跟着变红变蓝
              '--rcsc-success': 'oklch(0.62 0.17 150)',
              '--rcsc-success-light': 'color-mix(in oklab, oklch(0.62 0.17 150) 12%, var(--background))',
              '--rcsc-border-color': 'var(--border)',
              '--rcsc-bg-color': 'var(--muted)',
              '--rcsc-text-color': 'var(--muted-foreground)',
              '--rcsc-button-color': 'var(--primary)',
              '--rcsc-button-hover-color': 'var(--primary-foreground)',
              '--rcsc-button-bg-color': 'var(--card)',
              '--rcsc-panel-border-radius': 'calc(var(--radius) + 2px)',
              '--rcsc-control-border-radius': 'var(--radius)',
              '--rcsc-control-height': '40px'
            }}
            tipText={{
              default: t('login.sliderTip'),
              loading: t('login.sliderLoading'),
              moving: t('login.sliderMoving'),
              verifying: t('login.sliderVerifying'),
              success: t('login.sliderSuccess'),
              error: t('login.sliderError'),
              errors: t('login.sliderError'),
              loadFailed: t('login.sliderLoadFailed')
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
