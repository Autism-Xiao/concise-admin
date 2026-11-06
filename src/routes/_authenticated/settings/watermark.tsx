import { createFileRoute } from '@tanstack/react-router'
import { WatermarkSettingPage } from '@/features/settings/watermark'

export const Route = createFileRoute('/_authenticated/settings/watermark')({
  component: WatermarkSettingPage
})
