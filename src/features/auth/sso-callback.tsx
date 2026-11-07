import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Logo } from '@/assets/logo'
import { login, setMenuTree, setMustChangePassword, setPermissions, setTokens } from '@/lib/auth'
import { resolveHomePath } from '@/lib/home-path'
import { notifyPermissionsChanged } from '@/lib/permissions'
import { exchangeSsoCode, fetchPermissions } from './api'

type Phase = 'exchanging' | 'error'

/**
 * SSO 回调落地页：IdP 授权成功后浏览器带着 ?sso_code=xxx 回到这里，
 * 用 code 调 exchange 换取本项目 JWT，成功后的落库/权限拉取/跳转与密码登录同构。
 * 失败（code 过期/IdP 报错）展示错误卡片 + 返回登录页按钮。
 */
export function SsoCallbackPage({ ssoCode, error }: { ssoCode?: string; error?: string }) {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>(error ? 'error' : 'exchanging')
  const [message, setMessage] = useState(error ?? '')
  // 一次性 code：StrictMode 下 effect 会跑两次，用 ref 保证只 exchange 一次（第二次会因 code 已消费而失败）
  const startedRef = useRef(false)

  useEffect(() => {
    if (error || !ssoCode || startedRef.current) return
    startedRef.current = true
    void (async () => {
      try {
        const data = await exchangeSsoCode(ssoCode)
        const user = data.userInfo ?? data.user ?? {}
        const username = user.username ?? 'sso'
        setTokens(data.accessToken ?? data.token, data.refreshToken)
        const firstRole = Array.isArray(user.roles) ? user.roles[0] : undefined
        const roleCode = typeof firstRole === 'string' ? firstRole : (firstRole?.roleCode ?? user.role ?? 'viewer')
        login({ username, name: user.nickname ?? user.realname ?? user.name ?? username, role: roleCode })
        setMustChangePassword(!!data.mustChangePassword)
        try {
          const perm = await fetchPermissions()
          setPermissions(perm.permissions ?? [])
          setMenuTree(perm.menus ?? [])
        } catch {
          // 权限接口异常时不写入菜单，permissions.ts 按「无可见菜单」处理
        }
        notifyPermissionsChanged()
        toast.success('单点登录成功')
        void navigate({ to: resolveHomePath() as never })
      } catch (err) {
        setPhase('error')
        setMessage(err instanceof Error ? err.message : '单点登录失败，请重试')
      }
    })()
  }, [error, ssoCode, navigate])

  if (phase === 'exchanging') {
    return (
      <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-4">
        <Logo className="h-10 w-10" />
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在完成单点登录…
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <div className="border-destructive/30 bg-destructive/5 flex max-w-md flex-col items-center gap-3 rounded-xl border p-8 text-center">
        <TriangleAlert className="text-destructive h-8 w-8" />
        <div className="text-base font-semibold">单点登录失败</div>
        <p className="text-muted-foreground text-sm break-all">{message || '登录凭证无效或已过期，请重新发起登录'}</p>
        <Button className="mt-2 w-full" onClick={() => void navigate({ to: '/login' })}>
          返回登录页
        </Button>
      </div>
    </div>
  )
}
