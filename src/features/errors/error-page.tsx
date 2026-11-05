import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

interface ErrorPageProps {
  code: string
  title: string
  description: string
}

export function ErrorPage({ code, title, description }: ErrorPageProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="text-muted-foreground text-7xl font-bold tracking-tight">{code}</div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground max-w-md">{description}</p>
      <div className="mt-2 flex gap-2">
        <Button variant="outline" onClick={() => window.history.back()}>
          返回上一页
        </Button>
        <Button asChild>
          {/* 走 "/" 由首页解析逻辑决定落地页：没有仪表盘权限的账号不会又被弹回 403 */}
          <Link to="/">回到首页</Link>
        </Button>
      </div>
    </div>
  )
}
