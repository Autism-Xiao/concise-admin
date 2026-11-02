import { createFileRoute } from '@tanstack/react-router'
import { AccountPage } from '@/features/settings/account'

export const Route = createFileRoute('/_authenticated/settings/account')({
  component: AccountPage
})
