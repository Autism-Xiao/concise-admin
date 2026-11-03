import { createFileRoute } from '@tanstack/react-router'
import { NoticePage } from '@/features/system/notice'

export const Route = createFileRoute('/_authenticated/system/notice')({
  component: NoticePage
})
