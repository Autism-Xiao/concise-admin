import { createRootRoute, Outlet } from '@tanstack/react-router'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CommandMenu } from '@/components/command-menu'
import { SearchProvider } from '@/context/search-provider'
import { LocaleProvider } from '@/context/locale-provider'
import { NotFoundError } from '@/features/errors'

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <NotFoundError />
    </div>
  )
})

function RootLayout() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <LocaleProvider>
        <SearchProvider>
          <TooltipProvider>
            <Outlet />
            <CommandMenu />
            <Toaster richColors position="top-center" />
          </TooltipProvider>
        </SearchProvider>
      </LocaleProvider>
      {/* <TanStackRouterDevtools /> */}
    </ThemeProvider>
  )
}
