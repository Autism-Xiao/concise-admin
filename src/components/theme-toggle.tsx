import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useLocale } from '@/context/locale-provider'
import { startThemeTransition } from '@/lib/theme'

export function ThemeToggle() {
  const { setTheme } = useTheme()
  const { t } = useLocale()

  const switchTheme = (theme: string) => startThemeTransition(() => setTheme(theme))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">{t('theme.toggle')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => switchTheme('light')}>
          <Sun />
          {t('theme.light')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchTheme('dark')}>
          <Moon />
          {t('theme.dark')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchTheme('system')}>
          <Monitor />
          {t('theme.system')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
