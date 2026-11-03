import { createFileRoute } from '@tanstack/react-router'
import { CacheMonitorPage } from '@/features/ops/cache'

export const Route = createFileRoute('/_authenticated/ops/cache')({
  component: CacheMonitorPage
})
