import { createFileRoute } from '@tanstack/react-router'
import { ShortcutsPage } from '@/features/settings/shortcuts'

export const Route = createFileRoute('/_authenticated/settings/shortcuts')({
  component: ShortcutsPage
})
