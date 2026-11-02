import { createFileRoute } from '@tanstack/react-router'
import { InternalServerError } from '@/features/errors'

export const Route = createFileRoute('/errors/500')({
  component: InternalServerError
})
