import { createFileRoute } from '@tanstack/react-router'
import { ConfigPage } from '@/features/system/config'

export const Route = createFileRoute('/_authenticated/system/config')({
  component: ConfigPage
})
