import { createFileRoute } from '@tanstack/react-router'
import { FilePage } from '@/features/system/file'

export const Route = createFileRoute('/_authenticated/system/file')({
  component: FilePage
})
