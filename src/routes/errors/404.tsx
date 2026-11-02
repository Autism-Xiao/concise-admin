import { createFileRoute } from '@tanstack/react-router'
import { NotFoundError } from '@/features/errors'

export const Route = createFileRoute('/errors/404')({
  component: NotFoundError
})
