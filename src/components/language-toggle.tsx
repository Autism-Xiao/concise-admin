import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { localeNames, type Locale } from '@/config/i18n'
import { useLocale } from '@/context/locale-provider'

export function LanguageToggle() {
  const { locale, setLocale, t } = useLocale()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Languages className="size-4" />
          <span className="sr-only">{t('language.switch')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(localeNames) as Locale[]).map(l => (
          <DropdownMenuItem key={l} onClick={() => setLocale(l)} data-active={l === locale}>
            {localeNames[l]}
            {l === locale && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
