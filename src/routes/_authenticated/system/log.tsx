import { createFileRoute } from '@tanstack/react-router'
import { LogPage } from '@/features/system/log'

export const Route = createFileRoute('/_authenticated/system/log')({
  component: LogPage
})
