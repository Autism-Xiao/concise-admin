import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { RotateCw, X } from 'lucide-react'
import { useLocale } from '@/context/locale-provider'
import { useTabs } from '@/context/tabs-provider'
import { PAGE_REGISTRY } from '@/config/page-registry'
import { cn } from '@/lib/utils'

interface MenuState {
  x: number
  y: number
  path: string
}

export function PageTabs() {
  const { tabs, closeTab, closeOthers, closeSide, closeAll, refreshTab, reorderTabs } = useTabs()
  const pathname = useLocation({ select: location => location.pathname })
  const navigate = useNavigate()
  const { t } = useLocale()
  const [menu, setMenu] = useState<MenuState | null>(null)
  const dragFrom = useRef<number | null>(null)

  // 右键菜单打开时，点击其他位置 / 按 Esc / 滚动都会关闭
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', onKey)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', close)
    }
  }, [menu])

  const labelOf = (path: string) => {
    const entry = PAGE_REGISTRY[path]
    if (!entry) return path
    return entry.titleKey ? t(entry.titleKey) : (entry.label ?? path)
  }

  const menuIndex = menu ? tabs.findIndex(tb => tb.path === menu.path) : -1
  const menuTab = menuIndex >= 0 ? tabs[menuIndex] : null
  const closableLeft = menuIndex > 0 && tabs.slice(0, menuIndex).some(tb => !tb.pinned)
  const closableRight = menuIndex >= 0 && tabs.slice(menuIndex + 1).some(tb => !tb.pinned)
  const closableOthers = menuTab != null && tabs.some(tb => !tb.pinned && tb.path !== menuTab.path)
  const closableAny = tabs.some(tb => !tb.pinned)

  const menuItems = menu
    ? [
        { label: '刷新', icon: RotateCw, disabled: false, action: () => refreshTab(menu.path) },
        { label: '关闭当前', disabled: !!menuTab?.pinned, action: () => closeTab(menu.path) },
        { label: '关闭其他', disabled: !closableOthers, action: () => closeOthers(menu.path) },
        { label: '关闭左侧', disabled: !closableLeft, action: () => closeSide(menu.path, 'left') },
        { label: '关闭右侧', disabled: !closableRight, action: () => closeSide(menu.path, 'right') },
        { label: '关闭全部', disabled: !closableAny, action: closeAll }
      ]
    : []

  return (
    <div data-scroll="tabs" className="bg-muted/40 relative hidden h-10 shrink-0 items-center gap-1 overflow-x-auto border-b px-2 md:flex">
      {tabs.map((tab, i) => {
        const entry = PAGE_REGISTRY[tab.path]
        if (!entry) return null
        const Icon = entry.icon
        const active = tab.path === pathname
        return (
          <div
            key={tab.path}
            role="button"
            tabIndex={0}
            draggable
            onDragStart={() => {
              dragFrom.current = i
            }}
            onDragOver={e => e.preventDefault()}
            onDrop={() => {
              if (dragFrom.current != null) reorderTabs(dragFrom.current, i)
              dragFrom.current = null
            }}
            onClick={() => void navigate({ to: tab.path as never })}
            onKeyDown={e => {
              if (e.key === 'Enter') void navigate({ to: tab.path as never })
            }}
            onAuxClick={e => {
              // 鼠标中键直接关闭
              if (e.button === 1 && !tab.pinned) closeTab(tab.path)
            }}
            onContextMenu={e => {
              e.preventDefault()
              setMenu({ x: e.clientX, y: e.clientY, path: tab.path })
            }}
            className={cn(
              'group flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs whitespace-nowrap transition-colors select-none',
              active
                ? 'bg-background text-foreground border-border shadow-xs'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground border-transparent'
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            <span>{labelOf(tab.path)}</span>
            {!tab.pinned && (
              <button
                type="button"
                aria-label={`关闭 ${labelOf(tab.path)}`}
                onClick={e => {
                  e.stopPropagation()
                  closeTab(tab.path)
                }}
                className={cn(
                  'hover:bg-muted -mr-1 flex size-4 items-center justify-center rounded-sm transition-opacity',
                  active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        )
      })}

      {menu && (
        <div
          className="bg-popover text-popover-foreground fixed z-50 min-w-32 rounded-md border p-1 shadow-md"
          style={{ left: menu.x, top: menu.y }}
          onPointerDown={e => e.stopPropagation()}
        >
          {menuItems.map(item => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                item.action()
                setMenu(null)
              }}
              className={cn(
                'hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs',
                'disabled:pointer-events-none disabled:opacity-50'
              )}
            >
              {item.icon && <item.icon className="size-3.5" />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
