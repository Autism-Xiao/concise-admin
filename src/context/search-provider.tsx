import { createContext, useContext, useState, type ReactNode } from 'react'

import { useShortcutAction } from '@/context/shortcut-provider'

interface SearchContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const SearchContext = createContext<SearchContextValue | null>(null)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  // 组合键可改绑：统一交给 ShortcutProvider 调度，这里只注册动作
  useShortcutAction('commandMenu', () => setOpen(prev => !prev))

  return <SearchContext.Provider value={{ open, setOpen }}>{children}</SearchContext.Provider>
}

export function useSearch() {
  const ctx = useContext(SearchContext)
  if (!ctx) throw new Error('useSearch 必须在 SearchProvider 内使用')
  return ctx
}
