import { createFileRoute } from '@tanstack/react-router'
import { LoginLogPage } from '@/features/system/log/login'

export const Route = createFileRoute('/_authenticated/system/log/login')({
  component: LoginLogPage
})
