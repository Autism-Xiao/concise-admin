import { createFileRoute } from '@tanstack/react-router'
import { MaintenanceError } from '@/features/errors'

export const Route = createFileRoute('/_authenticated/errors/503')({
  component: MaintenanceError
})
