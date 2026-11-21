import { useContext, useEffect, useState, type ReactNode } from 'react'
import { createHmrSafeContext } from '@/lib/hmr-context'
import { dictionaries, type Locale, type TranslationKey } from '@/config/i18n'

const LOCALE_KEY = 'concise-locale'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  /** 取译文；params 用于填充文案里的 {name} 占位符（如 login.desc 的 {app}） */
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

const LocaleContext = createHmrSafeContext<LocaleContextValue | null>('concise.context.locale', null)

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

  const t = (key: TranslationKey, params?: Record<string, string | number>) => {
    const text = dictionaries[locale][key]
    if (!params) return text
    return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
  }

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale 必须在 LocaleProvider 内使用')
  return ctx
}
