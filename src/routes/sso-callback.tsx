import { createFileRoute } from '@tanstack/react-router'
import { SsoCallbackPage } from '@/features/auth/sso-callback'

/**
 * SSO 回调落地路由：IdP 授权成功后浏览器先到后端 /api/v1/auth/sso/callback，
 * 后端再 302 到这里并带一次性 sso_code（或 error 文案）。
 */
export const Route = createFileRoute('/sso-callback')({
  validateSearch: (search: Record<string, unknown>) => ({
    sso_code: typeof search.sso_code === 'string' ? search.sso_code : undefined,
    error: typeof search.error === 'string' ? search.error : undefined
  }),
  component: SsoCallbackRoute
})

function SsoCallbackRoute() {
  const { sso_code: ssoCode, error } = Route.useSearch()
  return <SsoCallbackPage ssoCode={ssoCode} error={error} />
}
