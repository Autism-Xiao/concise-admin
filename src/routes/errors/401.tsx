import { createFileRoute } from '@tanstack/react-router'
import { UnauthorizedError } from '@/features/errors'

export const Route = createFileRoute('/errors/401')({
  component: UnauthorizedError
})
