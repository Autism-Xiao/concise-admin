import { createFileRoute } from '@tanstack/react-router'
import { RolePage } from '@/features/system/role'

export const Route = createFileRoute('/_authenticated/system/role')({
  component: RolePage
})
