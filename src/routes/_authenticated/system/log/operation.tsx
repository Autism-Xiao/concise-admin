import { createFileRoute } from '@tanstack/react-router'
import { OperationLogPage } from '@/features/system/log/operation'

export const Route = createFileRoute('/_authenticated/system/log/operation')({
  component: OperationLogPage
})
