import { createFileRoute } from '@tanstack/react-router'
import { InternalServerError } from '@/features/errors'

export const Route = createFileRoute('/_authenticated/errors/500')({
  component: InternalServerError
})
