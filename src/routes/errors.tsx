import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/errors')({
  component: ErrorsLayout
})

function ErrorsLayout() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <Outlet />
    </div>
  )
}
