import { createFileRoute } from '@tanstack/react-router'
import { JobPage } from '@/features/ops/job'

export const Route = createFileRoute('/_authenticated/ops/job')({
  component: JobPage
})
