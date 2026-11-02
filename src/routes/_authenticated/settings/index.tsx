import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '@/features/settings/profile'

export const Route = createFileRoute('/_authenticated/settings/')({
  component: ProfilePage
})
