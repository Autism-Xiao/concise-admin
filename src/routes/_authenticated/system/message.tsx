import { createFileRoute } from '@tanstack/react-router'
import { MessagePage } from '@/features/system/message'

export const Route = createFileRoute('/_authenticated/system/message')({
  component: MessagePage
})
