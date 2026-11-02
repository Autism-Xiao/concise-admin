import { createFileRoute } from '@tanstack/react-router'
import { DeptPage } from '@/features/system/dept'

export const Route = createFileRoute('/_authenticated/system/dept')({
  component: DeptPage
})
