import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface SettingsNavItem {
  href: string
  title: string
  icon: ReactNode
}

export function SidebarNav({ items, className }: { items: SettingsNavItem[]; className?: string }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [val, setVal] = useState(pathname ?? '/settings')

  const handleSelect = (href: string) => {
    setVal(href)
    void navigate({ to: href })
  }

  return (
    <>
      {/* 移动端：下拉选择 */}
      <div className="p-1 md:hidden">
        <Select value={val} onValueChange={handleSelect}>
          <SelectTrigger className="h-12 sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map(item => (
              <SelectItem key={item.href} value={item.href}>
                <span className="flex items-center gap-x-2">
                  {item.icon}
                  {item.title}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 桌面端：侧边导航 */}
      <nav className={cn('hidden space-x-2 py-1 md:flex lg:flex-col lg:space-y-1 lg:space-x-0', className)}>
        {items.map(item => (
          <Link
            key={item.href}
            to={item.href}
            activeOptions={{ exact: true }}
            className={cn(
              buttonVariants({ variant: 'ghost' }),
              pathname === item.href ? 'bg-muted hover:bg-accent' : 'hover:bg-accent hover:underline',
              'justify-start'
            )}
          >
            <span className="me-2">{item.icon}</span>
            {item.title}
          </Link>
        ))}
      </nav>
    </>
  )
}
