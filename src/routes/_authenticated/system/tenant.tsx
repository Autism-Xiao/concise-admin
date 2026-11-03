import { createFileRoute } from '@tanstack/react-router'
import { TenantPage } from '@/features/system/tenant'

export const Route = createFileRoute('/_authenticated/system/tenant')({
  component: TenantPage
})
