import { createFileRoute } from '@tanstack/react-router'
import { OpenPlatformPage } from '@/features/system/app'

export const Route = createFileRoute('/_authenticated/system/app')({
  component: OpenPlatformPage
})
