import { createFileRoute, redirect } from '@tanstack/react-router'
import { LoginPage } from '@/features/auth/login'
import { isAuthenticated } from '@/lib/auth'
import { resolveHomePathFromStorage } from '@/lib/home-path'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: resolveHomePathFromStorage() as never })
    }
  },
  component: LoginPage
})
