import { createFileRoute } from '@tanstack/react-router'
import { MenuPage } from '@/features/system/menu'

export const Route = createFileRoute('/_authenticated/system/menu')({
  component: MenuPage
})
