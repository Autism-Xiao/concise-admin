import { createFileRoute } from '@tanstack/react-router'
import { DisplayPage } from '@/features/settings/display'

export const Route = createFileRoute('/_authenticated/settings/display')({
  component: DisplayPage
})
