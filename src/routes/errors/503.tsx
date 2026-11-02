import { createFileRoute } from '@tanstack/react-router'
import { MaintenanceError } from '@/features/errors'

export const Route = createFileRoute('/errors/503')({
  component: MaintenanceError
})
