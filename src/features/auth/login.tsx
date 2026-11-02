import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/assets/logo'
import { useLocale } from '@/context/locale-provider'
import { login } from '@/lib/auth'
import { CaptchaImage, randomCaptchaCode } from './components/captcha'

export function LoginPage() {
  const navigate = useNavigate()
  const { t } = useLocale()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [captchaInput, setCaptchaInput] = useState('')
  const [captchaCode, setCaptchaCode] = useState(randomCaptchaCode)

  const refreshCaptcha = () => {
    setCaptchaCode(randomCaptchaCode())
    setCaptchaInput('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (captchaInput.trim().toLowerCase() !== captchaCode.toLowerCase()) {
      toast.error(t('login.captchaError'))
      refreshCaptcha()
      return
    }
    login(account)
    toast.success(t('login.success'))
    void navigate({ to: '/dashboard' })
  }

  return (
    <div className="bg-muted flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Logo className="text-primary size-12" />
          <CardTitle className="text-xl">
            {t('login.title')} {import.meta.env.VITE_APP_NAME}
          </CardTitle>
          <CardDescription>{t('login.desc')}</CardDescription>
        </CardHeader>
        <CardContent>
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
            <Button type="submit" className="w-full">
              {t('login.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
