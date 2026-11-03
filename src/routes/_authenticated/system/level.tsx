import { createFileRoute } from '@tanstack/react-router'
import { LevelPage } from '@/features/system/level'

export const Route = createFileRoute('/_authenticated/system/level')({
  component: LevelPage
})
