import { createFileRoute } from '@tanstack/react-router'
import { NotificationsPage } from '@/features/settings/notifications'

export const Route = createFileRoute('/_authenticated/settings/notifications')({
  component: NotificationsPage
})
