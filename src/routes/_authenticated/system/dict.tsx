import { createFileRoute } from '@tanstack/react-router'
import { DictPage } from '@/features/system/dict'

export const Route = createFileRoute('/_authenticated/system/dict')({
  component: DictPage
})
