import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { dictionaries, type Locale, type TranslationKey } from '@/config/i18n'

const LOCALE_KEY = 'concise-locale'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem(LOCALE_KEY)
    return saved === 'en' || saved === 'zh' ? saved : 'zh'
  })

  const setLocale = (next: Locale) => {
    setLocaleState(next)
    localStorage.setItem(LOCALE_KEY, next)
  }

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
  }, [locale])

  const t = (key: TranslationKey) => dictionaries[locale][key]

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale 必须在 LocaleProvider 内使用')
  return ctx
}
