import { createFileRoute } from '@tanstack/react-router'
import { CalendarPage } from '@/features/system/calendar'

export const Route = createFileRoute('/_authenticated/system/calendar')({
  component: CalendarPage
})
