import { createFileRoute } from '@tanstack/react-router'
import { OnlineUsersPage } from '@/features/ops/online'

export const Route = createFileRoute('/_authenticated/ops/online')({
  component: OnlineUsersPage
})
