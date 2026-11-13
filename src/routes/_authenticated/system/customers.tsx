import { createFileRoute } from '@tanstack/react-router'
import { CustomerPage } from '@/features/customer'

export const Route = createFileRoute('/_authenticated/system/customers')({
  component: CustomerPage
})
