import { createFileRoute } from '@tanstack/react-router'
import { ServerMonitorPage } from '@/features/ops/server'

export const Route = createFileRoute('/_authenticated/ops/server')({
  component: ServerMonitorPage
})
