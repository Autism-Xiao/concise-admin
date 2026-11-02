import { useMemo, useState } from 'react'
import { useNavigate, type LinkProps } from '@tanstack/react-router'
import { ArrowRight, ChevronRight, Laptop, Moon, Search, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useSearch } from '@/context/search-provider'
import { useLocale } from '@/context/locale-provider'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { startThemeTransition } from '@/lib/theme'
import { navGroups } from '@/config/nav'

type RouteUrl = LinkProps['to'] | (string & {})

interface CommandEntry {
  group: string
  label: string
  url?: RouteUrl
  action?: () => void
  icon?: React.ReactNode
}

export function CommandMenu() {
  const navigate = useNavigate()
  const { setTheme } = useTheme()
  const { open, setOpen } = useSearch()
  const { t } = useLocale()
  const [query, setQuery] = useState('')

  const entries = useMemo<CommandEntry[]>(() => {
    const list: CommandEntry[] = []
    for (const group of navGroups) {
      for (const item of group.items) {
        if (item.url) {
          list.push({ group: t(group.titleKey), label: t(item.titleKey), url: item.url })
        } else {
          for (const sub of item.items ?? []) {
            list.push({ group: t(group.titleKey), label: `${t(item.titleKey)} / ${t(sub.titleKey)}`, url: sub.url })
          }
        }
      }
    }
    list.push(
      { group: t('theme.toggle'), label: t('theme.light'), action: () => startThemeTransition(() => setTheme('light')), icon: <Sun className="size-4" /> },
      { group: t('theme.toggle'), label: t('theme.dark'), action: () => startThemeTransition(() => setTheme('dark')), icon: <Moon className="size-4" /> },
      { group: t('theme.toggle'), label: t('theme.system'), action: () => startThemeTransition(() => setTheme('system')), icon: <Laptop className="size-4" /> }
    )
    return list
  }, [setTheme, t])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(e => e.label.toLowerCase().includes(q) || e.group.toLowerCase().includes(q))
  }, [entries, query])

  const grouped = useMemo(() => {
    const map = new Map<string, CommandEntry[]>()
    for (const entry of filtered) {
      const list = map.get(entry.group) ?? []
      list.push(entry)
      map.set(entry.group, list)
    }
    return [...map.entries()]
  }, [filtered])

  const run = (entry: CommandEntry) => {
    setOpen(false)
    setQuery('')
    if (entry.url) void navigate({ to: entry.url })
    entry.action?.()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        setOpen(v)
        if (!v) setQuery('')
      }}
    >
      <DialogContent className="overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
        <DialogTitle className="sr-only">{t('search.title')}</DialogTitle>
        <div className="flex items-center border-b px-3">
          <Search className="text-muted-foreground size-4 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && filtered.length > 0) run(filtered[0])
            }}
            placeholder={t('search.inputPlaceholder')}
            className="placeholder:text-muted-foreground h-12 w-full bg-transparent px-3 text-sm outline-none"
          />
          <kbd className="bg-muted pointer-events-none hidden h-5 items-center rounded border px-1.5 font-mono text-[10px] sm:flex">ESC</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {grouped.length === 0 && <div className="text-muted-foreground py-6 text-center text-sm">{t('search.empty')}</div>}
          {grouped.map(([group, list]) => (
            <div key={group}>
              <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">{group}</div>
              {list.map(entry => (
                <button
                  key={entry.label}
                  onClick={() => run(entry)}
                  className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none"
                >
                  {entry.icon ?? <ArrowRight className="text-muted-foreground/80 size-3" />}
                  <span>{entry.label}</span>
                  {entry.label.includes(' / ') && <ChevronRight className="size-3 opacity-0" />}
                </button>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
