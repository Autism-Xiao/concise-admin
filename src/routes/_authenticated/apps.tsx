import { createFileRoute } from '@tanstack/react-router'
import { AppsPage } from '@/features/apps'

export const Route = createFileRoute('/_authenticated/apps')({
  component: AppsPage
})
