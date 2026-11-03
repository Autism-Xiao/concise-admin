import { Fragment } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { useLocale } from '@/context/locale-provider'
import { navGroups } from '@/config/nav'

interface Crumb {
  label: string
  /** 有 to 渲染为链接，最后一级或无路由渲染为纯文本 */
  to?: string
}

// 设置中心子页标题（与 features/settings 内的子导航一致）
const SETTINGS_LABELS: Record<string, string> = {
  '/settings': '个人资料',
  '/settings/account': '账户',
  '/settings/appearance': '外观',
  '/settings/notifications': '通知',
  '/settings/display': '显示'
}

export function BreadcrumbNav() {
  const pathname = useLocation({ select: location => location.pathname })
  const { t } = useLocale()

  let crumbs: Crumb[] = []

  if (pathname.startsWith('/settings')) {
    crumbs = [{ label: t('nav.settings'), to: '/settings' }]
    const sub = SETTINGS_LABELS[pathname]
    if (sub) crumbs.push({ label: sub })
    else if (pathname !== '/settings') crumbs.push({ label: pathname.split('/').pop() ?? '' })
  } else {
    for (const group of navGroups) {
      for (const item of group.items) {
        if (item.url === pathname) {
          crumbs = [{ label: t(item.titleKey) }]
          break
        }
        const sub = item.items?.find(s => s.url === pathname)
        if (sub) {
          crumbs = [{ label: t(item.titleKey) }, { label: t(sub.titleKey) }]
          break
        }
      }
      if (crumbs.length) break
    }
    if (!crumbs.length) {
      const seg = pathname.split('/').filter(Boolean).pop()
      if (seg) crumbs = [{ label: seg }]
    }
  }

  if (!crumbs.length) return null

  return (
    <Breadcrumb className="hidden sm:block">
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1
          return (
            <Fragment key={`${crumb.label}-${i}`}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {last || !crumb.to ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.to}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
