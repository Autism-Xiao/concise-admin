import { createFileRoute } from '@tanstack/react-router'
import { MyWatermarkPage } from '@/features/settings/my-watermark'

export const Route = createFileRoute('/_authenticated/settings/my-watermark')({
  component: MyWatermarkPage
})
