import { createFileRoute } from '@tanstack/react-router'
import { BizOrderPage } from '@/features/biz_order'

export const Route = createFileRoute('/_authenticated/system/biz_orders')({
  component: BizOrderPage
})
