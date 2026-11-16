import { createFileRoute } from '@tanstack/react-router'
import { ChangeLogPage } from '@/features/system/log/change'

export const Route = createFileRoute('/_authenticated/system/log/change')({
  component: ChangeLogPage
})
