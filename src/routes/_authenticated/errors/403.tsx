import { createFileRoute } from '@tanstack/react-router'
import { ForbiddenError } from '@/features/errors'

export const Route = createFileRoute('/_authenticated/errors/403')({
  component: ForbiddenError
})
