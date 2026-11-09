import { createFileRoute } from '@tanstack/react-router'
import { TaskPage } from '@/features/system/task'

export const Route = createFileRoute('/_authenticated/system/task')({
  component: TaskPage
})
